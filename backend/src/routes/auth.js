import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db_mysql.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = express.Router();

// Hash palsu untuk menyamakan waktu respon saat email tidak ditemukan (anti user-enumeration)
const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10);

const ROUTE_MAP = {
  dashboard: '/app/dashboard',
  pos_cashier: '/app/pos',
  orders: '/app/orders',
  payments: '/app/payments',
  shifts: '/app/closing',
  access_scan: '/app/simulator',
  access_logs: '/app/access/logs',
  tickets: '/app/visitors',
  gates: '/app/gates',
  members: '/app/members',
  member_cards: '/app/member-cards',
  membership_plans: '/app/membership-plans',
  vouchers: '/app/vouchers',
  bookings: '/app/bookings',
  registrations: '/app/registrations',
  products: '/app/products',
  business_units: '/app/business-units',
  sales_report: '/app/reports/sales',
  item_report: '/app/reports/items',
  closing: '/app/reports/closing',
  report_schedules: '/app/reports/schedules',
  backups: '/app/reports/backups',
  outlets: '/app/system/outlets',
  users: '/app/system/users',
  roles: '/app/system/roles',
  menus: '/app/system/menus',
  audit_logs: '/app/system/audit-logs',
  settings: '/app/system/settings'
};

export async function getRoleMenuStructure(roleId, roleName) {
  let effectiveRoleId = roleId;
  if (!effectiveRoleId && roleName) {
    const [rRows] = await pool.query('SELECT id FROM roles WHERE name = ? LIMIT 1', [roleName]);
    effectiveRoleId = rRows[0]?.id;
  }

  const [menus] = await pool.query(
    'SELECT id, parent_id, code, label, icon, route, sort_order, is_group, is_active FROM menus WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'
  );
  const [perms] = await pool.query(
    'SELECT menu_id, can_create, can_read, can_update, can_delete FROM role_menu_permissions WHERE role_id = ?',
    [effectiveRoleId || 0]
  );

  const permByMenuId = new Map(perms.map(p => [p.menu_id, p]));
  const permissions = {};
  for (const m of menus) {
    if (!m.is_group) {
      const p = permByMenuId.get(m.id);
      permissions[m.code] = {
        can_read: Boolean(p?.can_read),
        can_create: Boolean(p?.can_create),
        can_update: Boolean(p?.can_update),
        can_delete: Boolean(p?.can_delete)
      };
    }
  }

  // Top-level groups & standalone items
  const topLevel = menus.filter(m => m.parent_id === null);
  const childrenByParent = new Map();
  for (const m of menus) {
    if (m.parent_id !== null) {
      if (!childrenByParent.has(m.parent_id)) childrenByParent.set(m.parent_id, []);
      childrenByParent.get(m.parent_id).push(m);
    }
  }

  const menuGroups = [];
  for (const top of topLevel) {
    if (top.is_group) {
      const children = (childrenByParent.get(top.id) || [])
        .filter(ch => permByMenuId.get(ch.id)?.can_read)
        .map(ch => ({
          id: ch.id,
          code: ch.code,
          label: ch.label,
          icon: ch.icon,
          path: ROUTE_MAP[ch.code] || (`/app${ch.route || ''}`),
          permissions: permissions[ch.code]
        }));

      if (children.length > 0) {
        menuGroups.push({
          id: top.id,
          code: top.code,
          label: top.label,
          icon: top.icon,
          is_group: true,
          items: children
        });
      }
    } else if (permByMenuId.get(top.id)?.can_read) {
      menuGroups.push({
        id: top.id,
        code: top.code,
        label: top.label,
        icon: top.icon,
        is_group: false,
        items: [{
          id: top.id,
          code: top.code,
          label: top.label,
          icon: top.icon,
          path: ROUTE_MAP[top.code] || (`/app${top.route || ''}`),
          permissions: permissions[top.code]
        }]
      });
    }
  }

  return { menu_groups: menuGroups, permissions };
}

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ success: false, code: 'VALIDATION', message: 'Email dan password wajib diisi.' });
    }

    const [rows] = await pool.query(`
      SELECT u.id, u.role_id, u.name, u.email, u.password_hash, u.is_active, u.outlet_id, r.name AS role_name, r.description AS role_description
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
    const { menu_groups, permissions } = await getRoleMenuStructure(user.role_id, user.role_name);

    res.json({
      success: true,
      data: {
        token,
        expires_at: new Date(exp * 1000).toISOString(),
        user: {
          id: user.id,
          role_id: user.role_id,
          name: user.name,
          email: user.email,
          role: user.role_name,
          role_description: user.role_description,
          outlet_id: user.outlet_id
        },
        menu_groups,
        permissions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v1/auth/me -> validasi token + info sisa waktu sesi + menu groups & permissions terbaru
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { menu_groups, permissions } = await getRoleMenuStructure(req.user.role_id, req.user.role);
    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          role_id: req.user.role_id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          outlet_id: req.user.outlet_id
        },
        menu_groups,
        permissions,
        expires_at: new Date(req.user.exp * 1000).toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
