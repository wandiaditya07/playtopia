import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db_mysql.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = express.Router();

// Hash palsu untuk menyamakan waktu respon saat email tidak ditemukan (anti user-enumeration)
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10);

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ success: false, code: 'VALIDATION', message: 'Email dan password wajib diisi.' });
    }

    const [rows] = await pool.query(`
      SELECT u.id, u.name, u.email, u.password_hash, u.is_active, u.outlet_id, r.name AS role_name
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.email = ? LIMIT 1
    `, [email]);

    const user = rows[0];
    const passwordOk = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);

    if (!user || !passwordOk) {
      return res.status(401).json({ success: false, code: 'INVALID_CREDENTIALS', message: 'Email atau password salah.' });
    }
    if (!user.is_active) {
      return res.status(403).json({ success: false, code: 'USER_INACTIVE', message: 'Akun Anda dinonaktifkan. Hubungi admin.' });
    }

    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    const token = signToken(user);
    const { exp } = jwt.decode(token);

    res.json({
      success: true,
      data: {
        token,
        expires_at: new Date(exp * 1000).toISOString(),
        user: { id: user.id, name: user.name, email: user.email, role: user.role_name, outlet_id: user.outlet_id }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v1/auth/me  -> validasi token + info sisa waktu sesi
router.get('/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      user: { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role, outlet_id: req.user.outlet_id },
      expires_at: new Date(req.user.exp * 1000).toISOString()
    }
  });
});

export default router;

