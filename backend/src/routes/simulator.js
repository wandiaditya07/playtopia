import express from 'express';
import { pool } from '../db_mysql.js';

const router = express.Router();

// GET /api/v1/simulator/logs
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

// GET /api/v1/simulator/outbox
router.get('/outbox', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT o.id, o.order_no, o.customer_name, o.total, p.method,
        CONCAT('Halo ', o.customer_name, '! Invoice Anda: ', o.order_no, ' senilai Rp ', FORMAT(o.total, 0), '. Tiket Anda aktif di Turnstile Gate.') as content,
        'TICKET_QR' as type,
        '08123456789' as phone,
        o.created_at
      FROM orders o
      LEFT JOIN payments p ON p.order_id = o.id
      ORDER BY o.id DESC LIMIT 20
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/simulator/fast-forward-time (Uji coba denda overtime instan)
router.post('/fast-forward-time', async (req, res) => {
  try {
    const { ticket_id, advance_minutes, minutes: reqMinutes } = req.body;
    const rawMinutes = advance_minutes ?? reqMinutes ?? 75;
    if (!ticket_id) {
      return res.status(400).json({ success: false, message: 'Ticket ID diperlukan' });
    }

    const [tickets] = await pool.query('SELECT * FROM tickets WHERE id = ?', [ticket_id]);
    if (tickets.length === 0) {
      return res.status(404).json({ success: false, message: 'Tiket tidak ditemukan' });
    }
    if (tickets[0].status !== 'active' || !tickets[0].first_in_at || !tickets[0].play_minutes) {
      return res.status(409).json({ success: false, message: 'Hanya tiket berdurasi yang sudah scan masuk yang bisa dimajukan waktunya.' });
    }
    const minutes = Number(rawMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 1440) {
      return res.status(400).json({ success: false, message: 'Menit harus antara 1 - 1440.' });
    }

    // Geser ends_at ke waktu lampau
    await pool.query(`
      UPDATE tickets 
      SET ends_at = DATE_SUB(NOW(), INTERVAL ? MINUTE), updated_at = NOW() 
      WHERE id = ?
    `, [minutes, ticket_id]);

    res.json({
      success: true,
      message: `Waktu tiket #${tickets[0].ticket_code} berhasil dimundurkan ${advance_minutes} menit di database MySQL. Tiket sekarang dalam status Overtime untuk pengujian gate keluar!`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v1/simulator/summary
router.get('/summary', async (req, res) => {
  try {
    const [activeTickets] = await pool.query("SELECT COUNT(*) as count FROM tickets WHERE status = 'active'");
    const [totalOrders] = await pool.query("SELECT COUNT(*) as count FROM orders");
    const [totalScans] = await pool.query("SELECT COUNT(*) as count FROM access_logs");

    res.json({
      success: true,
      data: {
        active_visitors_in_playground: activeTickets[0].count,
        total_transactions: totalOrders[0].count,
        total_gate_scans: totalScans[0].count,
        mysql_database: 'playtopia_id (100.113.174.74)',
        hardware_mock_status: {
          turnstile_relay: 'ONLINE (MOCK READY)',
          rfid_reader_mifare: 'CONNECTED (KEYBOARD WEDGE READY)',
          printer_thermal_80mm: 'READY (ESC-POS EMULATOR)',
          cash_drawer_rj11: 'AUTO-KICK ENABLED',
          dual_screen: 'BROADCAST_CHANNEL ENABLED'
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
