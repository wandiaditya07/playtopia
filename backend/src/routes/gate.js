import express from 'express';
import crypto from 'node:crypto';
import { pool } from '../db_mysql.js';
import { requireAuth, requireGateOrUser } from '../middleware/auth.js';

const router = express.Router();

const OVERTIME_BLOCK_MINUTES = 60; // Poin 13: di-charge per 1 jam (60 menit)
const GATE_RELAY_DURATION_MS = 10000; // Poin 10 & 11: autogate turnstile terbuka 10 detik (10.000 ms)

// Poin 13 + Revisi: Biaya overtime mengikuti harga 1 tiket (base_price produk tiket) per kelipatan 1 jam
const overtimeFeeFor = (minutes, ticketPrice) => {
  const unitTicketPrice = Number(ticketPrice) > 0 ? Number(ticketPrice) : 50000;
  const blocks = Math.max(1, Math.ceil(Math.max(1, Number(minutes) || 1) / OVERTIME_BLOCK_MINUTES));
  return blocks * unitTicketPrice;
};

function resolveVisitorName(row, fallback = 'Pengunjung') {
  if (row?.order_notes && row?.ticket_code) {
    try {
      const parsed = JSON.parse(row.order_notes);
      const byTicket = parsed?.ticket_visitors?.[row.ticket_code];
      if (byTicket) return String(byTicket);
    } catch {
      // ignore non-json notes
    }
  }
  return row?.visitor_name || fallback;
}

// POST /api/v1/gate/verify-access (JWT user ATAU header x-gate-key dari hardware)
router.post('/verify-access', requireGateOrUser, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      gate_id = 'GATE-IN-01',
      direction = 'IN',
      exit_type = 'FINISH', // 'FINISH' (pulang/selesai -> hilang dari list aktif) | 'TOILET' (izin ke WC maks 2x)
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

    // Cari tiket berdasarkan ticket_code atau card_uid (RFID Mifare / Swipe)
    const [tickets] = await conn.query(`
      SELECT t.*, p.name as package_name, p.is_open_play, p.base_price as ticket_price,
             COALESCE(NULLIF(o.customer_name, ''), m.name, 'Pengunjung') as visitor_name,
             o.notes as order_notes,
             m.id as member_id
      FROM tickets t
      JOIN products p ON t.product_id = p.id
      LEFT JOIN orders o ON t.order_id = o.id
      LEFT JOIN members m ON t.member_id = m.id
      LEFT JOIN member_cards mc ON mc.member_id = m.id
      WHERE t.ticket_code = ? OR mc.card_uid = ?
      ORDER BY t.id DESC LIMIT 1
    `, [cleanCred, cleanCred]);

    const ticket = tickets.length > 0 ? tickets[0] : null;
    if (ticket) {
      ticket.visitor_name = resolveVisitorName(ticket, ticket.visitor_name);
    }

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

    // Direction: IN
    if (direction.toLowerCase() === 'in') {
      // First-time entry
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
          relay_duration_ms: GATE_RELAY_DURATION_MS,
          buzzer: 'BEEP_SUCCESS',
          message: `Selamat Datang, ${ticket.visitor_name}! Gate terbuka selama 10 detik.`,
          visitor_info: {
            ticket_id: ticket.id,
            ticket_code: ticket.ticket_code,
            visitor_name: ticket.visitor_name,
            package_name: ticket.package_name,
            reentry_remaining: ticket.max_reentry
          }
        });
      }

      // Re-entry
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

      // Quota check
      if (ticket.reentries_used >= ticket.max_reentry) {
        await conn.query(`
          INSERT INTO access_logs (gate_id, outlet_id, ticket_id, scanned_code, direction, result, deny_reason, passed, scanned_at)
          VALUES (1, 1, ?, ?, 'in', 'deny', 'MAX_REENTRY_EXCEEDED', 0, NOW())
        `, [ticket.id, cleanCred]);

        return res.json({
          status: 'REJECTED',
          action: 'KEEP_LOCKED',
          buzzer: 'BEEP_ERROR',
          message: `Batas keluar-masuk ke toilet (Re-entry) maksimal ${ticket.max_reentry}x sudah habis!`
        });
      }

      // Update count
      const nextCount = ticket.reentries_used + 1;
      await conn.query('UPDATE tickets SET reentries_used = ?, updated_at = NOW() WHERE id = ?', [nextCount, ticket.id]);

      await conn.query(`
        INSERT INTO access_logs (gate_id, outlet_id, ticket_id, scanned_code, direction, result, passed, scanned_at)
        VALUES (1, 1, ?, ?, 'in', 'allow', 1, NOW())
      `, [ticket.id, cleanCred]);

      return res.json({
        status: 'SUCCESS',
        action: 'OPEN_GATE',
        relay_duration_ms: GATE_RELAY_DURATION_MS,
        buzzer: 'BEEP_SUCCESS',
        message: `Masuk kembali dari toilet (Re-entry ke-${nextCount}) berhasil! Gate terbuka 10 detik. Sisa kuota toilet: ${ticket.max_reentry - nextCount}x`,
        visitor_info: {
          ticket_id: ticket.id,
          ticket_code: ticket.ticket_code,
          visitor_name: ticket.visitor_name,
          reentry_count: nextCount,
          reentry_remaining: ticket.max_reentry - nextCount
        }
      });
    }

    // Direction: OUT
    if (direction.toLowerCase() === 'out') {
      if (ticket.status === 'unused') {
        return res.json({
          status: 'REJECTED',
          action: 'KEEP_LOCKED',
          buzzer: 'BEEP_ERROR',
          message: 'Tiket belum pernah digunakan untuk scan masuk!'
        });
      }

      const isOvertimeAlreadyPaid = Number(ticket.overtime_minutes) > 0 && Number(ticket.overtime_fee) === 0;

      // Overtime check (kecuali jika denda overtime sudah dibayar lunas di kasir)
      if (ticket.play_minutes && ticket.ends_at && !isOvertimeAlreadyPaid) {
        const diffMs = now.getTime() - new Date(ticket.ends_at).getTime();
        // Tolerance check (ends_at sudah termasuk play_minutes + tolerance_minutes 10 menit)
        if (diffMs > 0) {
          const overtimeMinutes = Math.ceil(diffMs / 60000);
          const overtimeFee = overtimeFeeFor(overtimeMinutes, ticket.ticket_price);

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
            message: `Overtime ${overtimeMinutes} menit (melewati toleransi 10 menit)! Charge 1 tiket: Rp ${overtimeFee.toLocaleString('id-ID')}. Silakan lunasi di kasir terlebih dahulu.`,
            overtime_info: {
              ticket_id: ticket.id,
              ticket_code: ticket.ticket_code,
              visitor_name: ticket.visitor_name,
              overtime_minutes: overtimeMinutes,
              overtime_fee: overtimeFee,
              ticket_price: ticket.ticket_price
            }
          });
        }
      }

      const isToiletExit = String(exit_type || '').toUpperCase() === 'TOILET' && !isOvertimeAlreadyPaid;

      if (isToiletExit) {
        if (ticket.reentries_used >= ticket.max_reentry) {
          await conn.query(`
            INSERT INTO access_logs (gate_id, outlet_id, ticket_id, scanned_code, direction, result, deny_reason, passed, scanned_at)
            VALUES (2, 1, ?, ?, 'out', 'deny', 'MAX_REENTRY_EXCEEDED', 0, NOW())
          `, [ticket.id, cleanCred]);

          return res.json({
            status: 'REJECTED',
            action: 'KEEP_LOCKED',
            buzzer: 'BEEP_ERROR',
            message: `Kuota izin keluar-masuk ke toilet (maksimal ${ticket.max_reentry}x) sudah habis! Silakan gunakan mode Keluar Selesai (Pulang).`
          });
        }

        await conn.query(`
          UPDATE tickets
          SET last_out_at = NOW(), updated_at = NOW()
          WHERE id = ?
        `, [ticket.id]);

        await conn.query(`
          INSERT INTO access_logs (gate_id, outlet_id, ticket_id, scanned_code, direction, result, passed, scanned_at)
          VALUES (2, 1, ?, ?, 'out', 'allow', 1, NOW())
        `, [ticket.id, cleanCred]);

        return res.json({
          status: 'SUCCESS',
          action: 'OPEN_GATE',
          relay_duration_ms: GATE_RELAY_DURATION_MS,
          buzzer: 'BEEP_SUCCESS',
          message: `Izin keluar sementara ke toilet untuk ${ticket.visitor_name} (Sisa kuota masuk kembali: ${ticket.max_reentry - ticket.reentries_used}x). Gate terbuka 10 detik.`,
          visitor_info: {
            ticket_id: ticket.id,
            ticket_code: ticket.ticket_code,
            visitor_name: ticket.visitor_name,
            exit_mode: 'TOILET'
          }
        });
      }

      // Keluar Selesai (Pulang / Setelah Bayar Overtime) -> Langsung COMPLETED & Hilang dari Temporary List Aktif!
      await conn.query(`
        UPDATE tickets 
        SET last_out_at = NOW(), 
            status = 'completed',
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
        relay_duration_ms: GATE_RELAY_DURATION_MS,
        buzzer: 'BEEP_SUCCESS',
        message: `Terima kasih atas kunjungannya, ${ticket.visitor_name}! Gate keluar terbuka 10 detik & sesi bermain selesai (masuk ke riwayat/logs).`,
        visitor_info: {
          ticket_id: ticket.id,
          ticket_code: ticket.ticket_code,
          visitor_name: ticket.visitor_name,
          exit_mode: 'COMPLETED'
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


// GET /api/v1/gate/timer-monitor (Public read-only endpoint for 1 Monitor Timer TV display)
router.get('/timer-monitor', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        t.id, t.ticket_code,
        COALESCE(NULLIF(o.customer_name, ''), m.name, 'Pengunjung') AS visitor_name,
        o.notes AS order_notes,
        p.name AS package_name,
        p.is_open_play,
        p.base_price AS ticket_price,
        t.play_minutes AS duration_minutes,
        t.first_in_at AS start_time,
        t.ends_at AS expiry_time,
        t.tolerance_minutes AS grace_period_minutes,
        t.max_reentry,
        t.reentries_used AS reentry_count,
        t.overtime_minutes,
        t.overtime_fee,
        t.status,
        t.created_at
      FROM tickets t
      JOIN products p ON t.product_id = p.id
      LEFT JOIN orders o ON t.order_id = o.id
      LEFT JOIN members m ON t.member_id = m.id
      WHERE t.status = 'active' AND t.valid_date = CURDATE()
      ORDER BY
        t.ends_at ASC,
        t.id DESC
    `);

    const now = Date.now();
    const enriched = rows.map(row => {
      const visitor_name = resolveVisitorName(row, row.visitor_name);
      const { order_notes, ...t } = row;
      t.visitor_name = visitor_name;
      const isOpenPlay = Boolean(t.is_open_play) || !t.duration_minutes;
      const overtimePaid = Number(t.overtime_minutes) > 0 && Number(t.overtime_fee) === 0 ? 1 : 0;

      if (!t.start_time || !t.expiry_time) {
        return {
          ...t,
          is_open_play: isOpenPlay,
          remaining_seconds: (t.duration_minutes || 0) * 60,
          remaining_minutes: t.duration_minutes || 0,
          is_overtime: false,
          overtime_paid: overtimePaid,
          calculated_overtime_minutes: 0
        };
      }

      const diffSeconds = Math.floor((new Date(t.expiry_time).getTime() - now) / 1000);
      const diffMinutes = Math.round(diffSeconds / 60);
      const isOvertime = diffSeconds < 0 && !isOpenPlay;
      const overtimeMinutes = isOvertime ? Math.ceil(Math.abs(diffSeconds) / 60) : 0;

      return {
        ...t,
        is_open_play: isOpenPlay,
        remaining_seconds: isOvertime ? diffSeconds : Math.max(diffSeconds, 0),
        remaining_minutes: isOvertime ? 0 : Math.max(diffMinutes, 0),
        calculated_overtime_minutes: overtimeMinutes,
        is_overtime: isOvertime,
        overtime_paid: overtimePaid,
        overtime_fee: (isOvertime && !overtimePaid) ? overtimeFeeFor(overtimeMinutes, t.ticket_price) : 0
      };
    });

    res.json({
      success: true,
      server_time: new Date().toISOString(),
      data: enriched
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Authenticated endpoints
router.use(requireAuth);

// GET /api/v1/gate/active-tickets
router.get('/active-tickets', async (req, res) => {
  try {
    const includeUnused = String(req.query.include_unused || '') === '1';
    const statusFilter = includeUnused ? "t.status IN ('unused', 'active')" : "t.status = 'active'";
    const [rows] = await pool.query(`
      SELECT
        t.id, t.ticket_code, t.ticket_code AS qr_token,
        (SELECT mc.card_uid FROM member_cards mc WHERE mc.member_id = t.member_id AND mc.status = 'active' LIMIT 1) AS rfid_uid,
        COALESCE(NULLIF(o.customer_name, ''), m.name, 'Pengunjung') AS visitor_name,
        o.notes AS order_notes,
        p.name AS package_name,
        p.is_open_play,
        p.base_price AS ticket_price,
        t.play_minutes AS duration_minutes,
        t.first_in_at AS start_time,
        t.ends_at AS expiry_time,
        t.tolerance_minutes AS grace_period_minutes,
        t.max_reentry,
        t.reentries_used AS reentry_count,
        t.overtime_minutes,
        t.overtime_fee,
        t.status
      FROM tickets t
      JOIN products p ON t.product_id = p.id
      LEFT JOIN orders o ON t.order_id = o.id
      LEFT JOIN members m ON t.member_id = m.id
      WHERE ${statusFilter} AND t.valid_date = CURDATE()
      ORDER BY t.id DESC
    `);

    const now = Date.now();
    const enriched = rows.map(row => {
      const visitor_name = resolveVisitorName(row, row.visitor_name);
      const { order_notes, ...t } = row;
      t.visitor_name = visitor_name;
      const overtimePaid = Number(t.overtime_minutes) > 0 && Number(t.overtime_fee) === 0 ? 1 : 0;
      if (!t.start_time || !t.expiry_time) {
        return {
          ...t,
          remaining_minutes: t.duration_minutes || 0,
          is_overtime: false,
          overtime_due: false,
          overtime_paid: overtimePaid,
          overtime_fee: 0,
          calculated_overtime_minutes: 0
        };
      }
      const diffMinutes = Math.round((new Date(t.expiry_time).getTime() - now) / 60000);
      const isOvertime = diffMinutes < 0 && !!t.duration_minutes && !t.is_open_play;
      const overtimeMinutes = isOvertime ? Math.max(1, Math.abs(diffMinutes)) : 0;
      return {
        ...t,
        remaining_minutes: isOvertime ? 0 : Math.max(diffMinutes, 0),
        calculated_overtime_minutes: overtimeMinutes,
        is_overtime: isOvertime,
        overtime_due: isOvertime && !overtimePaid,
        overtime_paid: overtimePaid,
        overtime_fee: (isOvertime && !overtimePaid) ? overtimeFeeFor(overtimeMinutes, t.ticket_price) : 0
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
             COALESCE(NULLIF(o.customer_name, ''), m.name, al.scanned_code) AS visitor_name,
             o.notes AS order_notes,
             IF(al.passed = 1, 1, 0) AS is_allowed
      FROM access_logs al
      LEFT JOIN tickets t ON al.ticket_id = t.id
      LEFT JOIN orders o ON t.order_id = o.id
      LEFT JOIN members m ON al.member_id = m.id
      ORDER BY al.id DESC
      LIMIT 100
    `);
    const cleaned = rows.map(r => {
      const visitor_name = resolveVisitorName(r, r.visitor_name);
      const { order_notes, ...rest } = r;
      return { ...rest, visitor_name };
    });
    res.json({ success: true, data: cleaned });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Pay overtime
router.post('/pay-overtime', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const ticketId = Number(req.body?.ticket_id);
    const cashGiven = Number(req.body?.cash_given ?? req.body?.cash_received);
    if (!Number.isInteger(ticketId)) {
      return res.status(400).json({ success: false, message: 'Ticket ID wajib diisi' });
    }

    await conn.beginTransaction();

    const [tickets] = await conn.query(`
      SELECT t.*, p.base_price AS ticket_price, p.name AS package_name
      FROM tickets t
      JOIN products p ON t.product_id = p.id
      WHERE t.id = ?
      FOR UPDATE
    `, [ticketId]);
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
    const fee = overtimeFeeFor(overtimeMinutes, ticket.ticket_price);

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

    // Tandai overtime sudah lunas (overtime_minutes > 0 & overtime_fee = 0.00) TANPA menambah waktu bermain baru.
    // Begitu pengunjung scan OUT di Gate Keluar, pintu terbuka & otomatis hilang dari list aktif!
    await conn.query(`
      UPDATE tickets
      SET overtime_minutes = ?, overtime_fee = 0.00, updated_at = NOW()
      WHERE id = ?
    `, [overtimeMinutes, ticketId]);

    await conn.commit();

    res.json({
      success: true,
      message: `Tagihan Overtime Rp ${fee.toLocaleString('id-ID')} (harga 1 tiket) lunas. Silakan scan keluar (OUT) di Gate untuk membuka pintu & menyelesaikan sesi.`,
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
