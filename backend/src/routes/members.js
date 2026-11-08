import express from 'express';
import { pool } from '../db_mysql.js';

const router = express.Router();

// GET all members
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    let query = `
      SELECT m.*, mc.card_uid, 10 as discount_pct, 'GOLD' as tier
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

// GET lookup member by card_uid or phone
router.get('/lookup/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const [rows] = await pool.query(`
      SELECT m.*, mc.card_uid, 10 as discount_pct, 'GOLD' as tier
      FROM members m
      LEFT JOIN member_cards mc ON mc.member_id = m.id AND mc.status = 'active'
      WHERE (mc.card_uid = ? OR m.phone = ?) AND m.status = 'active'
      LIMIT 1
    `, [identifier, identifier]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Member tidak ditemukan' });
    }
    res.json({ success: true, data: rows[0] });
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
      INSERT INTO members (member_code, name, phone, email, registered_outlet_id, balance, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, 'active', NOW(), NOW())
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
