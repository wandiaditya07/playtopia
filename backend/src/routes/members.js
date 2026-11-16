import express from 'express';
import { pool } from '../db_mysql.js';

const router = express.Router();

// GET all members
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    let query = `
      SELECT m.*, mc.card_uid,
        COALESCE(m.expires_on, DATE(DATE_ADD(m.created_at, INTERVAL 3 MONTH))) AS expires_on,
        20 AS playground_discount_pct,
        10 AS cafe_discount_pct,
        20 AS discount_pct,
        'MEMBER SWIPE' AS tier
      FROM members m
      LEFT JOIN member_cards mc ON mc.member_id = m.id AND mc.status = 'active'
      WHERE m.status = 'active'
    `;
    const params = [];

    if (q) {
      query += ' AND (m.phone LIKE ? OR mc.card_uid LIKE ? OR m.name LIKE ?)';
      const term = `%${q}%`;
      params.push(term, term, term);
    }
    query += ' ORDER BY m.id DESC';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET active vouchers for POS Cashier (Poin 3)
router.get('/vouchers/active', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id, code, name, discount_type, discount_value,
        COALESCE(min_purchase, 0) AS min_purchase,
        max_discount, valid_from, valid_until,
        usage_limit, used_count, stackable_with_member, is_active
      FROM vouchers
      WHERE is_active = 1
        AND (valid_until IS NULL OR valid_until >= NOW())
        AND (usage_limit IS NULL OR usage_limit = 0 OR used_count < usage_limit)
      ORDER BY id DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET lookup voucher by code for POS Cashier (Poin 3)
router.get('/vouchers/lookup/:code', async (req, res) => {
  try {
    const rawCode = String(req.params.code || '').trim().toUpperCase();
    if (!rawCode) {
      return res.status(400).json({ success: false, message: 'Kode voucher wajib diisi.' });
    }
    const [rows] = await pool.query(`
      SELECT
        id, code, name, discount_type, discount_value,
        COALESCE(min_purchase, 0) AS min_purchase,
        max_discount, valid_from, valid_until,
        usage_limit, used_count, stackable_with_member, is_active
      FROM vouchers
      WHERE UPPER(code) = ? OR UPPER(name) = ?
      ORDER BY id DESC
      LIMIT 1
    `, [rawCode, rawCode]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: `Kode voucher "${rawCode}" tidak ditemukan.` });
    }

    const v = rows[0];
    if (!v.is_active) {
      return res.status(400).json({ success: false, message: `Voucher "${v.code}" sudah tidak aktif.` });
    }
    if (v.valid_until && new Date(v.valid_until).getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: `Masa berlaku voucher "${v.code}" sudah habis.` });
    }
    if (v.usage_limit && Number(v.usage_limit) > 0 && Number(v.used_count) >= Number(v.usage_limit)) {
      return res.status(400).json({ success: false, message: `Kuota pemakaian voucher "${v.code}" sudah habis (${v.used_count}/${v.usage_limit}).` });
    }

    res.json({ success: true, data: v });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET lookup member by card_uid (Swipe), phone, member_code, or name
router.get('/lookup/:identifier', async (req, res) => {
  try {
    const raw = String(req.params.identifier || '').trim();
    const likeTerm = `%${raw}%`;
    const [rows] = await pool.query(`
      SELECT m.*, mc.card_uid,
        COALESCE(m.expires_on, DATE(DATE_ADD(m.created_at, INTERVAL 3 MONTH))) AS effective_expires_on,
        20 AS playground_discount_pct,
        10 AS cafe_discount_pct,
        20 AS discount_pct,
        'MEMBER SWIPE' AS tier
      FROM members m
      LEFT JOIN member_cards mc ON mc.member_id = m.id AND mc.status = 'active'
      WHERE m.status = 'active'
        AND (
          mc.card_uid = ?
          OR m.phone = ?
          OR m.member_code = ?
          OR m.name LIKE ?
          OR m.phone LIKE ?
          OR m.member_code LIKE ?
        )
      ORDER BY (mc.card_uid = ? OR m.phone = ? OR m.member_code = ?) DESC, m.id DESC
      LIMIT 1
    `, [raw, raw, raw.toUpperCase(), likeTerm, likeTerm, likeTerm, raw, raw, raw.toUpperCase()]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Member tidak ditemukan' });
    }
    const member = rows[0];

    // Pastikan expires_on terisi 3 bulan jika member lama belum punya expires_on
    if (!member.expires_on) {
      await pool.query(
        'UPDATE members SET expires_on = DATE_ADD(CURDATE(), INTERVAL 3 MONTH) WHERE id = ?',
        [member.id]
      );
      const [refreshed] = await pool.query('SELECT expires_on FROM members WHERE id = ?', [member.id]);
      member.expires_on = refreshed[0]?.expires_on || member.effective_expires_on;
    } else {
      member.expires_on = member.effective_expires_on;
    }

    const expDateStr = new Date(member.expires_on).toISOString().slice(0, 10);
    const todayStr = new Date().toISOString().slice(0, 10);
    if (expDateStr < todayStr) {
      return res.status(400).json({
        success: false,
        message: `Masa berlaku kartu member ${member.name} sudah habis (Expired: ${expDateStr}). Silakan perpanjang membership (3 bulan).`
      });
    }
    let children = [];
    let waiverCode = null;
    if (member.phone) {
      const [wRows] = await pool.query(
        'SELECT * FROM online_registrations WHERE phone = ? ORDER BY id DESC LIMIT 1',
        [String(member.phone).trim()]
      );
      if (wRows.length > 0) {
        waiverCode = wRows[0].registration_code;
        const rawGuest = String(wRows[0].guest_name || '');
        if (rawGuest.includes('||')) {
          const [, cPart] = rawGuest.split('||');
          if (cPart) {
            children = cPart
              .split(',')
              .map(item => {
                const [n, a] = String(item || '').trim().split(':');
                const name = String(n || '').trim();
                const age = Math.max(1, Math.min(18, Number(a) || 5));
                return name ? { name, age } : null;
              })
              .filter(Boolean);
          }
        }
      }
    }
    res.json({ success: true, data: { ...member, children, waiver_code: waiverCode } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST register new member
router.post('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { card_uid, name, phone, email, initial_balance = 0 } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Nama dan nomor telepon wajib diisi' });
    }

    const member_code = 'MBR-' + Date.now().toString().slice(-6);

    const [mRes] = await conn.query(`
      INSERT INTO members (member_code, name, phone, email, registered_outlet_id, expires_on, balance, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, DATE_ADD(CURDATE(), INTERVAL 3 MONTH), ?, 'active', NOW(), NOW())
    `, [member_code, name, phone, email || null, Number(initial_balance)]);
    const memberId = mRes.insertId;

    if (card_uid) {
      await conn.query(`
        INSERT INTO member_cards (member_id, card_uid, status, issued_at, created_at)
        VALUES (?, ?, 'active', NOW(), NOW())
      `, [memberId, card_uid.trim()]);
    }

    await conn.commit();
    res.status(201).json({
      success: true,
      message: 'Registrasi Member berhasil disimpan ke MySQL!',
      data: { id: memberId, member_code, name, phone, card_uid, balance: initial_balance }
    });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

// POST top up balance
router.post('/topup', async (req, res) => {
  try {
    const { member_id, amount } = req.body;
    if (!member_id || !amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Nominal top up tidak valid' });
    }

    await pool.query('UPDATE members SET balance = balance + ?, updated_at = NOW() WHERE id = ?', [Number(amount), member_id]);
    const [rows] = await pool.query('SELECT * FROM members WHERE id = ?', [member_id]);

    res.json({
      success: true,
      message: `Top up Rp ${Number(amount).toLocaleString('id-ID')} berhasil. Saldo saat ini: Rp ${Number(rows[0].balance).toLocaleString('id-ID')}`,
      data: rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
