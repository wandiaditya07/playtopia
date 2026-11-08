import express from 'express';
import { pool } from '../db_mysql.js';

const router = express.Router();

async function getShiftStats(shiftId) {
  const [salesRows] = await pool.query(`
    SELECT
      COUNT(DISTINCT o.id) AS total_transactions,
      COALESCE(SUM(o.total), 0) AS total_revenue,
      COALESCE(SUM(CASE WHEN p.method = 'cash' THEN p.amount ELSE 0 END), 0) AS cash_total,
      COALESCE(SUM(CASE WHEN p.method = 'qris' THEN p.amount ELSE 0 END), 0) AS qris_total,
      COALESCE(SUM(CASE WHEN p.method = 'card_edc' THEN p.amount ELSE 0 END), 0) AS debit_total,
      COALESCE(SUM(CASE WHEN p.method = 'member_balance' THEN p.amount ELSE 0 END), 0) AS member_balance_total
    FROM orders o
    LEFT JOIN payments p ON p.order_id = o.id AND p.status = 'paid'
    WHERE o.shift_id = ? AND o.status = 'paid'
  `, [shiftId]);

  const [breakdown] = await pool.query(`
    SELECT bu.code AS category, COALESCE(SUM(oi.line_total), 0) AS revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN business_units bu ON p.business_unit_id = bu.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.shift_id = ? AND o.status = 'paid'
    GROUP BY bu.code
  `, [shiftId]);

  const s = salesRows[0];
  return {
    total_transactions: s.total_transactions,
    total_revenue: s.total_revenue,
    cash_total: s.cash_total,
    qris_total: s.qris_total,
    debit_total: s.debit_total,
    member_balance_total: s.member_balance_total,
    playground_sales: breakdown.find(b => b.category === 'PLAYGROUND')?.revenue || 0,
    cafe_sales: breakdown.find(b => b.category === 'CAFE')?.revenue || 0
  };
}

// GET /api/v1/shifts/current -> shift terbuka milik user yang login
router.get('/current', async (req, res) => {
  try {
    const [shifts] = await pool.query(`
      SELECT s.*, u.name AS cashier_name
      FROM shifts s JOIN users u ON s.user_id = u.id
      WHERE s.status = 'open' AND s.user_id = ?
      ORDER BY s.id DESC LIMIT 1
    `, [req.user.id]);

    if (shifts.length === 0) {
      return res.json({ success: true, data: null, message: 'Tidak ada shift yang sedang buka' });
    }

    const shift = shifts[0];
    const stats = await getShiftStats(shift.id);
    res.json({
      success: true,
      data: { shift, stats: { ...stats, expected_cash_drawer: shift.opening_cash + stats.cash_total } }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/shifts/open
router.post('/open', async (req, res) => {
  try {
    const openingCash = Number(req.body?.opening_cash);
    if (!Number.isFinite(openingCash) || openingCash < 0) {
      return res.status(400).json({ success: false, message: 'Modal awal kas harus berupa angka 0 atau lebih.' });
    }

    const [existing] = await pool.query("SELECT id FROM shifts WHERE status = 'open' AND user_id = ?", [req.user.id]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Anda masih punya shift yang belum ditutup.' });
    }

    const [info] = await pool.query(`
      INSERT INTO shifts (outlet_id, user_id, status, opened_at, opening_cash, expected_cash, counted_cash, created_at, updated_at)
      VALUES (?, ?, 'open', NOW(), ?, ?, 0, NOW(), NOW())
    `, [req.user.outlet_id || 1, req.user.id, openingCash, openingCash]);

    res.status(201).json({ success: true, message: 'Shift kasir berhasil dibuka', data: { id: info.insertId, opening_cash: openingCash } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/shifts/close
router.post('/close', async (req, res) => {
  try {
    const shiftId = Number(req.body?.shift_id);
    const counted = Number(req.body?.closing_cash_actual);
    const notes = String(req.body?.notes || '').trim();
    const ownerEmail = String(req.body?.owner_email || '').trim();

    if (!Number.isInteger(shiftId)) {
      return res.status(400).json({ success: false, message: 'Shift tidak valid.' });
    }
    if (!Number.isFinite(counted) || counted < 0) {
      return res.status(400).json({ success: false, message: 'Uang fisik di laci harus berupa angka 0 atau lebih.' });
    }
    if (ownerEmail && !/^\S+@\S+\.\S+$/.test(ownerEmail)) {
      return res.status(400).json({ success: false, message: 'Format email owner tidak valid.' });
    }

    const [shifts] = await pool.query("SELECT * FROM shifts WHERE id = ? AND status = 'open'", [shiftId]);
    const shift = shifts[0];
    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift tidak ditemukan atau sudah ditutup.' });
    }
    if (shift.user_id !== req.user.id && !['Client', 'Admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Anda tidak boleh menutup shift milik kasir lain.' });
    }

    const stats = await getShiftStats(shift.id);
    const expected = shift.opening_cash + stats.cash_total;
    const variance = counted - expected;

    if (variance !== 0 && !notes) {
      return res.status(400).json({ success: false, message: 'Ada selisih kas. Catatan kasir wajib diisi untuk menjelaskan selisih.' });
    }

    await pool.query(`
      UPDATE shifts SET status = 'closed', closed_at = NOW(), expected_cash = ?, counted_cash = ?, notes = ?, updated_at = NOW()
      WHERE id = ?
    `, [expected, counted, notes || null, shift.id]);

    const rp = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;
    const report = `
=== LAPORAN CLOSING GABUNGAN PLAYGROUND & CAFE ===
Shift   : #${shift.id}
Kasir   : ${req.user.name}
Buka    : ${new Date(shift.opened_at).toLocaleString('id-ID')}
Tutup   : ${new Date().toLocaleString('id-ID')}
------------------------------------------------
Omset Playground : ${rp(stats.playground_sales)}
Omset Cafe       : ${rp(stats.cafe_sales)}
TOTAL OMSET      : ${rp(stats.total_revenue)} (${stats.total_transactions} transaksi)

Tunai            : ${rp(stats.cash_total)}
QRIS             : ${rp(stats.qris_total)}
Kartu EDC        : ${rp(stats.debit_total)}
Saldo Member     : ${rp(stats.member_balance_total)}

Modal Awal       : ${rp(shift.opening_cash)}
Seharusnya Laci  : ${rp(expected)}
Kas Fisik        : ${rp(counted)}
Selisih          : ${rp(variance)} ${variance === 0 ? '(PAS)' : variance > 0 ? '(LEBIH)' : '(KURANG)'}
------------------------------------------------
Catatan: ${notes || '-'}
Penerima laporan: ${ownerEmail || '-'} (pengiriman email belum diaktifkan - mode sandbox)
    `.trim();

    res.json({
      success: true,
      message: 'Closing shift berhasil disimpan.',
      data: { shift_id: shift.id, total_revenue: stats.total_revenue, expected_cash: expected, actual_cash: counted, cash_variance: variance, report_email: report }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
