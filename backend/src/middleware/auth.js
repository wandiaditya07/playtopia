import jwt from 'jsonwebtoken';
import { pool, sha256 } from '../db_mysql.js';

// JWT Config
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-playtopia-secret-change-me';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role_name,
      role_id: user.role_id,
      outlet_id: user.outlet_id || 1
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function unauthorized(res, code, message) {
  return res.status(401).json({ success: false, code, message });
}

// Token parser
function readUserFromHeader(req, res) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    unauthorized(res, 'NO_TOKEN', 'Anda belum login. Silakan login terlebih dahulu.');
    return null;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      role_id: payload.role_id,
      outlet_id: payload.outlet_id || 1,
      exp: payload.exp
    };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      unauthorized(res, 'TOKEN_EXPIRED', 'Sesi login telah berakhir (expired). Silakan login kembali.');
    } else {
      unauthorized(res, 'TOKEN_INVALID', 'Token tidak valid. Silakan login kembali.');
    }
    return null;
  }
}

export function requireAuth(req, res, next) {
  const user = readUserFromHeader(req, res);
  if (!user) return;
  req.user = user;
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Anda tidak memiliki akses untuk aksi ini.' });
    }
    next();
  };
}

// Gate or user auth
export async function requireGateOrUser(req, res, next) {
  const gateKey = req.headers['x-gate-key'];
  if (gateKey) {
    try {
      const [rows] = await pool.query('SELECT id FROM gates WHERE api_key_hash = ? AND is_active = 1 LIMIT 1', [sha256(String(gateKey))]);
      if (rows.length === 0) {
        return unauthorized(res, 'GATE_KEY_INVALID', 'API key gate tidak valid.');
      }
      req.gate = { id: rows[0].id };
      return next();
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
  return requireAuth(req, res, next);
}
