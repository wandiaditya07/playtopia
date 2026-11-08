import express from 'express';
import crypto from 'node:crypto';
import { pool } from '../db_mysql.js';
import { requireAuth, requireGateOrUser } from '../middleware/auth.js';

const router = express.Router();

const OVERTIME_BLOCK_MINUTES = 30;
const OVERTIME_FEE_PER_BLOCK = 15000;
const overtimeFeeFor = (minutes) => Math.ceil(minutes / OVERTIME_BLOCK_MINUTES) * OVERTIME_FEE_PER_BLOCK;

// POST /api/v1/gate/verify-access (JWT user ATAU header x-gate-key dari hardware)
router.post('/verify-access', requireGateOrUser, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      gate_id = 'GATE-IN-01',
      direction = 'IN',
      credential_type = 'QR',
      credential_value
    } = req.body;

    if (!credential_value) {
      return res.status(400).json({
        status: 'REJECTED',
        action: 'KEEP_LOCKED',
        buzzer: 'BEEP_ERROR',
        message: 'Payload scan kosong'
      });
    }

    const cleanCred = credential_value.trim();

    // Cari tiket berdasarkan ticket_code atau card_uid (RFID Mifare)
    const [tickets] = await conn.query(`
      SELECT t.*, p.name as package_name, p.is_open_play, COALESCE(m.name, 'Pengunjung') as visitor_name, m.id as member_id
      FROM tickets t
      JOIN products p ON t.product_id = p.id
      LEFT JOIN members m ON t.member_id = m.id
      LEFT JOIN member_cards mc ON mc.member_id = m.id
      WHERE t.ticket_code = ? OR mc.card_uid = ?
      ORDER BY t.id DESC LIMIT 1
    `, [cleanCred, cleanCred]);

    const ticket = tickets.length > 0 ? tickets[0] : null;

    if (!ticket) {
      await conn.query(`
        INSERT INTO access_logs (gate_id, outlet_id, scanned_code, direction, result, deny_reason, passed, scanned_at)
        VALUES (1, 1, ?, ?, 'deny', 'TICKET_NOT_FOUND', 0, NOW())
      `, [cleanCred, direction.toLowerCase()]);

      return res.json({
        status: 'REJECTED',
        action: 'KEEP_LOCKED',
        buzzer: 'BEEP_ERROR',
        message: 'Tiket atau Gelang RFID tidak terdaftar dalam sistem!'
      });
    }

    if (ticket.status === 'completed' || ticket.status === 'expired' || ticket.status === 'void') {
      await conn.query(`
        INSERT INTO access_logs (gate_id, outlet_id, ticket_id, scanned_code, direction, result, deny_reason, passed, scanned_at)
        VALUES (1, 1, ?, ?, ?, 'deny', 'TICKET_INACTIVE', 0, NOW())
      `, [ticket.id, cleanCred, direction.toLowerCase()]);

      return res.json({
        status: 'REJECTED',
        action: 'KEEP_LOCKED',
        buzzer: 'BEEP_ERROR',
        message: `Tiket sudah tidak aktif (Status: ${ticket.status})!`
      });
    }

    const now = new Date();

    // === DIRECTION: IN (MASUK PLAYGROUND) ===
    if (direction.toLowerCase() === 'in') {
      // 1. Scan Masuk Pertama Kali
      if (ticket.status === 'unused' || !ticket.first_in_at) {
        let endsAtSql = 'DATE_ADD(NOW(), INTERVAL (play_minutes + tolerance_minutes) MINUTE)';
        if (ticket.is_open_play || !ticket.play_minutes) {
          endsAtSql = "CONCAT(CURDATE(), ' 23:59:59')";
        }

        await conn.query(`
          UPDATE tickets 
          SET status = 'active', first_in_at = NOW(), ends_at = ${endsAtSql}, updated_at = NOW()
          WHERE id = ?
        `, [ticket.id]);

        await conn.query(`
          INSERT INTO access_logs (gate_id, outlet_id, ticket_id, member_id, scanned_code, direction, result, passed, scanned_at)
          VALUES (1, 1, ?, ?, ?, 'in', 'allow', 1, NOW())
        `, [ticket.id, ticket.member_id, cleanCred]);

        return res.json({
          status: 'SUCCESS',
          action: 'OPEN_GATE',
          relay_duration_ms: 3000,
          buzzer: 'BEEP_SUCCESS',
          message: `Selamat Datang, ${ticket.visitor_name}! Gate terbuka.`,
          visitor_info: {
            ticket_id: ticket.id,
            ticket_code: ticket.ticket_code,
            visitor_name: ticket.visitor_name,
            package_name: ticket.package_name,
            reentry_remaining: ticket.max_reentry
          }
        });
      }

      // 2. Re-entry (Keluar-Masuk)
      if (ticket.ends_at && now.getTime() > new Date(ticket.ends_at).getTime()) {
        await conn.query(`
          INSERT INTO access_logs (gate_id, outlet_id, ticket_id, scanned_code, direction, result, deny_reason, passed, scanned_at)
          VALUES (1, 1, ?, ?, 'in', 'deny', 'TIME_EXPIRED', 0, NOW())
        `, [ticket.id, cleanCred]);

        return res.json({
          status: 'REJECTED',
          action: 'KEEP_LOCKED',
          buzzer: 'BEEP_ERROR',
          message: 'Waktu bermain sudah habis! Tidak dapat masuk kembali.'
        });
      }

      // Cek Batas Re-entry (Maks 2x)
      if (ticket.reentries_used >= ticket.max_reentry) {
        await conn.query(`
          INSERT INTO access_logs (gate_id, outlet_id, ticket_id, scanned_code, direction, result, deny_reason, passed, scanned_at)
          VALUES (1, 1, ?, ?, 'in', 'deny', 'MAX_REENTRY_EXCEEDED', 0, NOW())
        `, [ticket.id, cleanCred]);

        return res.json({
          status: 'REJECTED',
          action: 'KEEP_LOCKED',
          buzzer: 'BEEP_ERROR',
          message: `Batas keluar-masuk (Re-entry) maksimal ${ticket.max_reentry}x sudah habis!`
        });
      }

      // Increment reentries_used
      const nextCount = ticket.reentries_used + 1;
      await conn.query('UPDATE tickets SET reentries_used = ?, updated_at = NOW() WHERE id = ?', [nextCount, ticket.id]);

      await conn.query(`
        INSERT INTO access_logs (gate_id, outlet_id, ticket_id, scanned_code, direction, result, passed, scanned_at)
        VALUES (1, 1, ?, ?, 'in', 'allow', 1, NOW())
      `, [ticket.id, cleanCred]);

      return res.json({
        status: 'SUCCESS',
        action: 'OPEN_GATE',
        relay_duration_ms: 3000,
        buzzer: 'BEEP_SUCCESS',
        message: `Re-entry ke-${nextCount} berhasil! Sisa kuota: ${ticket.max_reentry - nextCount}x`,
        visitor_info: {
          ticket_id: ticket.id,
          ticket_code: ticket.ticket_code,
          visitor_name: ticket.visitor_name,
          reentry_count: nextCount,
          reentry_remaining: ticket.max_reentry - nextCount
        }
      });
    }

    // === DIRECTION: OUT (KELUAR PLAYGROUND) ===
    if (direction.toLowerCase() === 'out') {
      if (ticket.status === 'unused') {
        return res.json({
          status: 'REJECTED',
          action: 'KEEP_LOCKED',
          buzzer: 'BEEP_ERROR',
          message: 'Tiket belum pernah digunakan untuk scan masuk!'
        });
      }

      // Cek Overtime
      if (ticket.play_minutes && ticket.ends_at) {
        const diffMs = now.getTime() - new Date(ticket.ends_at).getTime();
        // Melewati toleransi 10 menit
        if (diffMs > 0) {
          const overtimeMinutes = Math.ceil(diffMs / 60000);
          const overtimeFee = overtimeFeeFor(overtimeMinutes);

          await conn.query(`
            UPDATE tickets 
            SET overtime_minutes = ?, overtime_fee = ?, updated_at = NOW() 
            WHERE id = ?
          `, [overtimeMinutes, overtimeFee, ticket.id]);

          await conn.query(`
            INSERT INTO access_logs (gate_id, outlet_id, ticket_id, scanned_code, direction, result, deny_reason, passed, scanned_at)
            VALUES (2, 1, ?, ?, 'out', 'deny', 'OVERTIME', 0, NOW())
          `, [ticket.id, cleanCred]);

          return res.json({
            status: 'REJECTED',
            action: 'KEEP_LOCKED',
            buzzer: 'BEEP_ALARM',
            message: `Overtime ${overtimeMinutes} menit (melewati toleransi 10 menit)! Denda: Rp ${overtimeFee.toLocaleString('id-ID')}. Silakan bayar di kasir.`,
            overtime_info: {
              ticket_id: ticket.id,
              ticket_code: ticket.ticket_code,
              visitor_name: ticket.visitor_name,
              overtime_minutes: overtimeMinutes,
              overtime_fee: overtimeFee
            }
          });
        }
      }

      // Keluar Diizinkan
      await conn.query(`
        UPDATE tickets 
        SET last_out_at = NOW(), 
            status = IF(reentries_used >= max_reentry, 'completed', status),
            updated_at = NOW() 
        WHERE id = ?
      `, [ticket.id]);

      await conn.query(`
        INSERT INTO access_logs (gate_id, outlet_id, ticket_id, scanned_code, direction, result, passed, scanned_at)
        VALUES (2, 1, ?, ?, 'out', 'allow', 1, NOW())
      `, [ticket.id, cleanCred]);

      return res.json({
        status: 'SUCCESS',
        action: 'OPEN_GATE',
        relay_duration_ms: 3000,
        buzzer: 'BEEP_SUCCESS',
        message: `Terima kasih atas kunjungannya, ${ticket.visitor_name}! Gate keluar terbuka.`,
        visitor_info: {
          ticket_id: ticket.id,
          ticket_code: ticket.ticket_code,
          visitor_name: ticket.visitor_name
        }
      });
    }

    return res.status(400).json({ status: 'REJECTED', action: 'KEEP_LOCKED', message: 'Arah gate tidak valid' });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error.message });
  } finally {
    conn.release();
  }
});


// ===== Endpoint di bawah ini WAJIB login (JWT) =====
router.use(requireAuth);

// GET /api/v1/gate/active-tickets
router.get('/active-tickets', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        t.id, t.ticket_code, t.ticket_code AS qr_token,
        (SELECT mc.card_uid FROM member_cards mc WHERE mc.member_id = t.member_id AND mc.status = 'active' LIMIT 1) AS rfid_uid,
        COALESCE(m.name, 'Pengunjung') AS visitor_name,
        p.name AS package_name,
        t.play_minutes AS duration_minutes,
        t.first_in_at AS start_time,
        t.ends_at AS expiry_time,
        t.tolerance_minutes AS grace_period_minutes,
        t.max_reentry,
        t.reentries_used AS reentry_count,
        t.status
      FROM tickets t
      JOIN products p ON t.product_id = p.id
      LEFT JOIN members m ON t.member_id = m.id
      WHERE t.status IN ('unused', 'active') AND t.valid_date = CURDATE()
      ORDER BY t.id DESC
    `);

    const now = Date.now();
    const enriched = rows.map(t => {
      if (!t.start_time || !t.expiry_time) {
        return { ...t, remaining_minutes: t.duration_minutes || 0, is_overtime: false, overtime_due: false, overtime_fee: 0, calculated_overtime_minutes: 0 };
      }
      const diffMinutes = Math.round((new Date(t.expiry_time).getTime() - now) / 60000);
      const isOvertime = diffMinutes < 0 && !!t.duration_minutes;
      const overtimeMinutes = isOvertime ? Math.abs(diffMinutes) : 0;
      return {
        ...t,
        remaining_minutes: isOvertime ? 0 : Math.max(diffMinutes, 0),
        calculated_overtime_minutes: overtimeMinutes,
        is_overtime: isOvertime,
        overtime_due: isOvertime,
        overtime_fee: isOvertime ? overtimeFeeFor(overtimeMinutes) : 0
      };
    });

    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v1/gate/logs
router.get('/logs', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT al.id, al.scanned_at, al.direction, al.result, al.deny_reason, al.passed,
             al.scanned_code AS credential_value, t.ticket_code,
             COALESCE(m.name, al.scanned_code) AS visitor_name,
             IF(al.passed = 1, 1, 0) AS is_allowed
      FROM access_logs al
      LEFT JOIN tickets t ON al.ticket_id = t.id
      LEFT JOIN members m ON al.member_id = m.id
      ORDER BY al.id DESC
      LIMIT 100
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/gate/pay-overtime  (kasir menerima pembayaran denda; tercatat sebagai order + payment)
router.post('/pay-overtime', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const ticketId = Number(req.body?.ticket_id);
    const cashGiven = Number(req.body?.cash_given ?? req.body?.cash_received);
    if (!Number.isInteger(ticketId)) {
      return res.status(400).json({ success: false, message: 'Ticket ID wajib diisi' });
    }

    await conn.beginTransaction();

    const [tickets] = await conn.query('SELECT * FROM tickets WHERE id = ? FOR UPDATE', [ticketId]);
    const ticket = tickets[0];
    if (!ticket) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Tiket tidak ditemukan' });
    }
    if (ticket.status !== 'active' || !ticket.ends_at || !ticket.play_minutes) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: 'Tiket ini tidak memiliki denda overtime.' });
    }

    const diffMs = Date.now() - new Date(ticket.ends_at).getTime();
    if (diffMs <= 0) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: 'Tiket belum overtime, tidak ada denda yang harus dibayar.' });
    }
    const overtimeMinutes = Math.ceil(diffMs / 60000);
    const fee = overtimeFeeFor(overtimeMinutes);

    if (!Number.isFinite(cashGiven) || cashGiven < fee) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: `Uang diterima kurang dari denda (Rp ${fee.toLocaleString('id-ID')}).` });
    }

    const [shifts] = await conn.query(
      "SELECT id FROM shifts WHERE status = 'open' AND (user_id = ? OR outlet_id = ?) ORDER BY (user_id = ?) DESC, id DESC LIMIT 1",
      [req.user.id, req.user.outlet_id || 1, req.user.id]
    );
    if (shifts.length === 0) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: 'Belum ada shift yang dibuka.' });
    }
    const [otProduct] = await conn.query("SELECT id FROM products WHERE sku = 'OT-FEE' LIMIT 1");
    if (otProduct.length === 0) {
      await conn.rollback();
      return res.status(500).json({ success: false, message: 'Produk denda overtime (OT-FEE) belum tersedia.' });
    }

    const orderNo = `OT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const [orderRes] = await conn.query(`
      INSERT INTO orders (order_no, outlet_id, shift_id, cashier_id, member_id, source, status, customer_name,
                          subtotal, member_discount, voucher_discount, tax_amount, total, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'pos', 'paid', 'Denda Overtime', ?, 0, 0, 0, ?, ?, NOW(), NOW())
    `, [orderNo, req.user.outlet_id || 1, shifts[0].id, req.user.id, ticket.member_id, fee, fee, `Overtime ${overtimeMinutes} menit - tiket ${ticket.ticket_code}`]);

    await conn.query(`
      INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_discount, created_at)
      VALUES (?, ?, ?, ?, 1, 0, NOW())
    `, [orderRes.insertId, otProduct[0].id, `Denda Overtime ${overtimeMinutes} menit`, fee]);

    await conn.query(`
      INSERT INTO payments (order_id, method, source, status, amount, cash_received, change_amount, paid_at, created_by, confirmed_by, created_at, updated_at)
      VALUES (?, 'cash', 'manual', 'paid', ?, ?, ?, NOW(), ?, ?, NOW(), NOW())
    `, [orderRes.insertId, fee, cashGiven, cashGiven - fee, req.user.id, req.user.id]);

    // Beri jendela 15 menit untuk keluar setelah denda lunas
    await conn.query(`
      UPDATE tickets
      SET ends_at = DATE_ADD(NOW(), INTERVAL 15 MINUTE), overtime_minutes = ?, overtime_fee = 0.00, updated_at = NOW()
      WHERE id = ?
    `, [overtimeMinutes, ticketId]);

    await conn.commit();

    res.json({
      success: true,
      message: `Denda Rp ${fee.toLocaleString('id-ID')} lunas. Pengunjung punya 15 menit untuk scan keluar.`,
      data: { ticket_id: ticketId, invoice_number: orderNo, fee, change_amount: cashGiven - fee }
    });
  } catch (error) {
    await conn.rollback().catch(() => {});
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

export default router;
