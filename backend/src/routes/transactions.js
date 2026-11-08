import express from 'express';
import crypto from 'node:crypto';
import { pool } from '../db_mysql.js';

const router = express.Router();

const MEMBER_DISCOUNT_PCT = 10;
const PAYMENT_METHODS = ['CASH', 'QRIS', 'DEBIT', 'MEMBER_BALANCE'];

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// GET /api/v1/transactions
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const [rows] = await pool.query(`
      SELECT o.*, o.order_no AS invoice_number, o.order_no AS order_number, o.total AS total_amount,
        o.member_discount AS discount_amount, p.method AS payment_method,
        u.name AS cashier_name, m.name AS member_name,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS total_items,
        (SELECT GROUP_CONCAT(product_name SEPARATOR ', ') FROM order_items oi WHERE oi.order_id = o.id) AS items_summary
      FROM orders o
      LEFT JOIN payments p ON p.order_id = o.id
      LEFT JOIN users u ON o.cashier_id = u.id
      LEFT JOIN members m ON o.member_id = m.id
      ORDER BY o.id DESC
      LIMIT ?
    `, [limit]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v1/transactions/:invoice
router.get('/:invoice', async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT * FROM orders WHERE order_no = ?', [req.params.invoice]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' });
    }
    const order = orders[0];
    const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    const [tickets] = await pool.query('SELECT * FROM tickets WHERE order_id = ?', [order.id]);
    res.json({ success: true, data: { ...order, invoice_number: order.order_no, items, tickets } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/transactions  (checkout kasir)
router.post('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      customer_name,
      items,
      payment_method = 'CASH',
      member_id = null,
      cash_given
    } = req.body || {};

    // ---------- Validasi input ----------
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      throw new HttpError(400, 'Keranjang belanja kosong atau terlalu banyak item.');
    }
    if (!PAYMENT_METHODS.includes(payment_method)) {
      throw new HttpError(400, 'Metode pembayaran tidak valid.');
    }
    for (const item of items) {
      if (!Number.isInteger(item.product_id) || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 99) {
        throw new HttpError(400, 'Data item tidak valid (product_id/qty).');
      }
    }

    await conn.beginTransaction();

    // ---------- Shift milik user yang login atau shift terbuka di outlet ----------
    const outlet_id = req.user.outlet_id || 1;
    const [shifts] = await conn.query(
      "SELECT id FROM shifts WHERE status = 'open' AND (user_id = ? OR outlet_id = ?) ORDER BY (user_id = ?) DESC, id DESC LIMIT 1",
      [req.user.id, outlet_id, req.user.id]
    );
    if (shifts.length === 0) {
      throw new HttpError(409, 'Belum ada shift yang dibuka. Buka shift terlebih dahulu di menu Closing Shift.');
    }
    const shift_id = shifts[0].id;

    // ---------- Harga & data produk SELALU dari database ----------
    const ids = [...new Set(items.map(i => i.product_id))];
    const [productRows] = await conn.query(
      `SELECT id, sku, name, product_type, base_price, play_minutes, covers_children, max_reentry, tolerance_minutes
       FROM products WHERE id IN (?) AND is_active = 1 AND sku <> 'OT-FEE'`, [ids]);
    const productMap = new Map(productRows.map(p => [p.id, p]));
    if (productMap.size !== ids.length) {
      throw new HttpError(400, 'Ada produk yang tidak ditemukan atau sudah tidak aktif.');
    }

    let subtotal = 0;
    const lines = items.map(item => {
      const p = productMap.get(item.product_id);
      subtotal += p.base_price * item.qty;
      return { item, product: p };
    });

    // ---------- Member & diskon (dihitung server) ----------
    let member = null;
    if (member_id) {
      const [m] = await conn.query("SELECT * FROM members WHERE id = ? AND status = 'active'", [member_id]);
      if (m.length === 0) throw new HttpError(404, 'Member tidak ditemukan atau tidak aktif.');
      member = m[0];
    }
    const discount = member ? Math.round((subtotal * MEMBER_DISCOUNT_PCT) / 100) : 0;
    const total = subtotal - discount;
    if (total <= 0) throw new HttpError(400, 'Total transaksi harus lebih dari 0.');

    // ---------- Pembayaran ----------
    let method = 'cash';
    let source = 'manual';
    let cashReceived = null;
    let changeAmount = null;
    let cardLast4 = null;
    let approvalCode = null;
    let midtransOrderId = null;

    const order_no = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    if (payment_method === 'CASH') {
      cashReceived = Number(cash_given);
      if (!Number.isFinite(cashReceived) || cashReceived < total) {
        throw new HttpError(400, 'Uang diterima kurang dari total tagihan.');
      }
      changeAmount = cashReceived - total;
    } else if (payment_method === 'QRIS') {
      method = 'qris';
      source = 'midtrans';
      midtransOrderId = `MID-${order_no}`;
    } else if (payment_method === 'DEBIT') {
      method = 'card_edc';
      cardLast4 = '8888'; // sandbox: nanti diganti data mesin EDC
      approvalCode = `APP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    } else {
      if (!member) throw new HttpError(400, 'Pilih member terlebih dahulu untuk bayar dengan saldo.');
      method = 'member_balance';
      source = 'wallet';
      // Potong saldo secara atomik (mencegah race condition / saldo minus)
      const [upd] = await conn.query(
        'UPDATE members SET balance = balance - ?, updated_at = NOW() WHERE id = ? AND balance >= ?',
        [total, member.id, total]);
      if (upd.affectedRows === 0) {
        throw new HttpError(400, 'Saldo member tidak mencukupi.');
      }
    }

    // ---------- Simpan order ----------
    const [orderRes] = await conn.query(`
      INSERT INTO orders (order_no, outlet_id, shift_id, cashier_id, member_id, source, status, customer_name,
                          subtotal, member_discount, voucher_discount, tax_amount, total, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'pos', 'paid', ?, ?, ?, 0, 0, ?, NOW(), NOW())
    `, [order_no, outlet_id, shift_id, req.user.id, member ? member.id : null,
        member ? member.name : (String(customer_name || '').trim() || 'Pengunjung Umum'),
        subtotal, discount, total]);
    const order_id = orderRes.insertId;

    await conn.query(`
      INSERT INTO payments (order_id, method, source, status, amount, cash_received, change_amount,
                            card_last4, approval_code, midtrans_order_id, paid_at, created_by, confirmed_by, created_at, updated_at)
      VALUES (?, ?, ?, 'paid', ?, ?, ?, ?, ?, ?, NOW(), ?, ?, NOW(), NOW())
    `, [order_id, method, source, total, cashReceived, changeAmount, cardLast4, approvalCode, midtransOrderId, req.user.id, req.user.id]);

    // ---------- Item & tiket ----------
    const datePart = new Date().toISOString().slice(5, 10).replace('-', '');
    const generatedTickets = [];

    for (const { item, product } of lines) {
      const [itemRes] = await conn.query(`
        INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_discount, created_at)
        VALUES (?, ?, ?, ?, ?, 0, NOW())
      `, [order_id, product.id, product.name, product.base_price, item.qty]);

      if (product.product_type === 'ticket' || product.product_type === 'package') {
        const perUnit = Math.max(product.covers_children || 1, 1);
        const totalTickets = item.qty * perUnit;
        const names = Array.isArray(item.visitor_names) ? item.visitor_names : [];

        for (let i = 0; i < totalTickets; i++) {
          const ticket_code = `TCK-${datePart}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
          const visitor = String(names[i] || names[0] || '').trim();

          await conn.query(`
            INSERT INTO tickets (ticket_code, order_id, order_item_id, outlet_id, product_id, member_id, status, valid_date,
                                 play_minutes, tolerance_minutes, max_reentry, reentries_used, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 'unused', CURDATE(), ?, ?, ?, 0, NOW(), NOW())
          `, [ticket_code, order_id, itemRes.insertId, outlet_id, product.id, member ? member.id : null,
              product.play_minutes || null, product.tolerance_minutes ?? 10, product.max_reentry ?? 2]);

          generatedTickets.push({
            ticket_code,
            qr_token: ticket_code,
            visitor_name: visitor ? (totalTickets > 1 ? `${visitor} #${i + 1}` : visitor) : `Pengunjung #${i + 1}`,
            package_name: product.name,
            duration_minutes: product.play_minutes,
            grace_period_minutes: product.tolerance_minutes ?? 10,
            max_reentry: product.max_reentry ?? 2
          });
        }
      }
    }

    await conn.commit();

    res.status(201).json({
      success: true,
      message: 'Transaksi berhasil disimpan',
      data: {
        transaction_id: order_id,
        invoice_number: order_no,
        subtotal,
        discount,
        total_amount: total,
        cash_received: cashReceived,
        change_amount: changeAmount,
        payment_method,
        payment_status: 'PAID',
        items: lines.map(({ item, product }) => ({
          name: product.name, qty: item.qty, price: product.base_price, category: product.product_type
        })),
        tickets: generatedTickets
      }
    });
  } catch (error) {
    await conn.rollback().catch(() => {});
    const status = error instanceof HttpError ? error.status : 500;
    res.status(status).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

export default router;
