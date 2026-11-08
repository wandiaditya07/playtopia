import express from 'express';
import bcrypt from 'bcryptjs';
import { pool, sha256 } from '../db_mysql.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper catat ke audit_logs
async function logAudit(req, action, entityType, entityId, newData = null) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, outlet_id, action, entity_type, entity_id, new_data, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        req.user?.id || null,
        req.user?.outlet_id || 1,
        action,
        entityType,
        String(entityId || ''),
        newData ? JSON.stringify(newData) : null,
        req.ip || '127.0.0.1'
      ]
    );
  } catch (e) {
    console.warn('Audit log warn:', e.message);
  }
}

// 1. GET /api/v1/admin/dashboard -> Statistik real-time untuk halaman Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [[orderStats]] = await pool.query(`
      SELECT
        COUNT(*) AS total_orders,
        COALESCE(SUM(total), 0) AS total_revenue,
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total ELSE 0 END), 0) AS today_revenue,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) AS today_orders
      FROM orders WHERE status = 'paid'
    `);

    const [[visitorStats]] = await pool.query(`
      SELECT
        COUNT(*) AS active_visitors,
        COUNT(CASE WHEN ends_at IS NOT NULL AND NOW() > DATE_ADD(ends_at, INTERVAL COALESCE(tolerance_minutes, 10) MINUTE) AND status = 'active' THEN 1 END) AS overtime_visitors
      FROM tickets
      WHERE status IN ('issued', 'active') AND DATE(created_at) = CURDATE()
    `);

    const [[memberStats]] = await pool.query(`
      SELECT COUNT(*) AS total_members, COALESCE(SUM(balance), 0) AS total_wallet_balance
      FROM members WHERE status = 'active'
    `);

    const [unitSales] = await pool.query(`
      SELECT bu.code, bu.name, COALESCE(SUM(oi.line_total), 0) AS revenue, COALESCE(SUM(oi.quantity), 0) AS qty_sold
      FROM business_units bu
      LEFT JOIN products p ON p.business_unit_id = bu.id AND p.sku <> 'OT-FEE'
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'paid'
      WHERE bu.is_active = 1
      GROUP BY bu.id, bu.code, bu.name
      ORDER BY revenue DESC
    `);

    const [recentOrders] = await pool.query(`
      SELECT o.id, o.order_no, o.order_no AS order_number, o.customer_name, o.total, o.status, o.created_at,
             p.method AS payment_method, u.name AS cashier_name, m.name AS member_name
      FROM orders o
      LEFT JOIN payments p ON p.order_id = o.id
      LEFT JOIN users u ON o.cashier_id = u.id
      LEFT JOIN members m ON o.member_id = m.id
      ORDER BY o.id DESC LIMIT 6
    `);

    const [recentScans] = await pool.query(`
      SELECT al.id, al.direction, al.result, al.deny_reason, al.scanned_at, al.scanned_code AS credential_value, t.ticket_code
      FROM access_logs al
      LEFT JOIN tickets t ON al.ticket_id = t.id
      ORDER BY al.id DESC LIMIT 6
    `);

    res.json({
      success: true,
      data: {
        kpis: {
          today_revenue: orderStats.today_revenue,
          revenue_today: orderStats.today_revenue,
          today_orders: orderStats.today_orders,
          orders_today: orderStats.today_orders,
          total_revenue: orderStats.total_revenue,
          total_orders: orderStats.total_orders,
          active_visitors: visitorStats.active_visitors,
          overtime_visitors: visitorStats.overtime_visitors,
          total_members: memberStats.total_members,
          total_wallet_balance: memberStats.total_wallet_balance,
          total_member_balance: memberStats.total_wallet_balance
        },
        unit_sales: unitSales,
        revenue_by_unit: unitSales,
        recent_orders: recentOrders,
        recent_scans: recentScans
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. GET /api/v1/admin/roles-matrix -> Roles, Menus (Grouped), Role Menu Permissions, dan Users (3-in-1 RBAC)
router.get('/roles-matrix', async (req, res) => {
  try {
    const [roles] = await pool.query('SELECT * FROM roles ORDER BY id ASC');
    const [menus] = await pool.query('SELECT * FROM menus ORDER BY sort_order ASC, id ASC');
    const [permissions] = await pool.query('SELECT * FROM role_menu_permissions');
    const [users] = await pool.query(`
      SELECT u.id, u.role_id, u.outlet_id, u.name, u.email, u.is_active, u.last_login_at, u.created_at,
             r.name AS role_name, o.name AS outlet_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN outlets o ON u.outlet_id = o.id
      ORDER BY u.id ASC
    `);
    const [outlets] = await pool.query('SELECT id, code, name FROM outlets WHERE is_active = 1 ORDER BY id ASC');
    res.json({
      success: true,
      data: { roles, menus, permissions, users, outlets }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/admin/roles -> Buat Role Baru secara dinamis (+ opsional salin hak akses dari role lain)
router.post('/roles', requireRole('Admin'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim() || `Role operasional ${name}`;
    const cloneFromRoleId = Number(req.body?.clone_from_role_id) || 0;

    if (!name || name.length < 2) {
      return res.status(400).json({ success: false, message: 'Nama role wajib diisi (minimal 2 karakter).' });
    }

    const [dup] = await conn.query('SELECT id FROM roles WHERE LOWER(name) = LOWER(?) LIMIT 1', [name]);
    if (dup.length > 0) {
      return res.status(409).json({ success: false, message: `Role dengan nama "${name}" sudah terdaftar.` });
    }

    await conn.beginTransaction();
    const [info] = await conn.query(
      `INSERT INTO roles (name, description, is_system, is_active, created_at, updated_at)
       VALUES (?, ?, 0, 1, NOW(), NOW())`,
      [name, description]
    );
    const newRoleId = info.insertId;

    const [allMenus] = await conn.query('SELECT id, code FROM menus ORDER BY id ASC');
    let sourceMap = new Map();
    if (cloneFromRoleId > 0) {
      const [srcPerms] = await conn.query(
        'SELECT menu_id, can_read, can_create, can_update, can_delete FROM role_menu_permissions WHERE role_id = ?',
        [cloneFromRoleId]
      );
      sourceMap = new Map(srcPerms.map(p => [Number(p.menu_id), p]));
    }

    for (const m of allMenus) {
      const src = sourceMap.get(Number(m.id));
      const isDashboard = m.code === 'dashboard';
      const canRead = src ? (src.can_read ? 1 : 0) : (isDashboard ? 1 : 0);
      const canCreate = src ? (src.can_create ? 1 : 0) : 0;
      const canUpdate = src ? (src.can_update ? 1 : 0) : 0;
      const canDelete = src ? (src.can_delete ? 1 : 0) : 0;

      await conn.query(
        `INSERT INTO role_menu_permissions (role_id, menu_id, can_read, can_create, can_update, can_delete)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [newRoleId, m.id, canRead, canCreate, canUpdate, canDelete]
      );
    }

    await conn.commit();
    await logAudit(req, 'CREATE_ROLE', 'roles', newRoleId, { name, description, cloneFromRoleId });
    res.status(201).json({
      success: true,
      message: `Role "${name}" berhasil dibuat.`,
      data: { id: newRoleId, name, description }
    });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

// PUT /api/v1/admin/roles/:id -> Ubah Nama & Deskripsi Role
router.put('/roles/:id', requireRole('Admin'), async (req, res) => {
  try {
    const roleId = Number(req.params.id);
    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim();

    if (!Number.isInteger(roleId) || !name) {
      return res.status(400).json({ success: false, message: 'Nama role wajib diisi.' });
    }

    const [rows] = await pool.query('SELECT * FROM roles WHERE id = ? LIMIT 1', [roleId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Role tidak ditemukan.' });
    }

    const existing = rows[0];
    const finalName = existing.is_system ? existing.name : name;

    const [dup] = await pool.query('SELECT id FROM roles WHERE LOWER(name) = LOWER(?) AND id <> ? LIMIT 1', [finalName, roleId]);
    if (dup.length > 0) {
      return res.status(409).json({ success: false, message: `Nama role "${finalName}" sudah digunakan.` });
    }

    await pool.query(
      'UPDATE roles SET name = ?, description = ?, updated_at = NOW() WHERE id = ?',
      [finalName, description, roleId]
    );

    await logAudit(req, 'UPDATE_ROLE', 'roles', roleId, { name: finalName, description });
    res.json({ success: true, message: `Informasi role "${finalName}" berhasil diperbarui.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/v1/admin/roles/:id -> Hapus Role Custom (dan pindahkan user ke role pengganti bila ada)
router.delete('/roles/:id', requireRole('Admin'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const roleId = Number(req.params.id);
    const fallbackRoleId = Number(req.query?.fallback_role_id || req.body?.fallback_role_id) || 3;

    const [rows] = await conn.query('SELECT * FROM roles WHERE id = ? LIMIT 1', [roleId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Role tidak ditemukan.' });
    }
    if (rows[0].is_system || [1, 2, 3].includes(roleId)) {
      return res.status(400).json({ success: false, message: 'Role bawaan sistem (Client, Admin, Staff) tidak dapat dihapus.' });
    }

    await conn.beginTransaction();
    await conn.query('UPDATE users SET role_id = ?, updated_at = NOW() WHERE role_id = ?', [fallbackRoleId, roleId]);
    await conn.query('DELETE FROM role_menu_permissions WHERE role_id = ?', [roleId]);
    await conn.query('DELETE FROM roles WHERE id = ?', [roleId]);
    await conn.commit();

    await logAudit(req, 'DELETE_ROLE', 'roles', roleId, { name: rows[0].name, fallbackRoleId });
    res.json({ success: true, message: `Role "${rows[0].name}" berhasil dihapus.` });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

// PUT /api/v1/admin/roles/:id/assign-user -> Masukkan / Pindahkan User ke Role Ini secara instan
router.put('/roles/:id/assign-user', requireRole('Admin'), async (req, res) => {
  try {
    const roleId = Number(req.params.id);
    const userId = Number(req.body?.user_id);

    if (!Number.isInteger(roleId) || !Number.isInteger(userId)) {
      return res.status(400).json({ success: false, message: 'Data role_id dan user_id wajib valid.' });
    }

    const [rRows] = await pool.query('SELECT id, name FROM roles WHERE id = ? LIMIT 1', [roleId]);
    if (rRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Role tujuan tidak ditemukan.' });
    }

    const [uRows] = await pool.query('SELECT id, name, email FROM users WHERE id = ? LIMIT 1', [userId]);
    if (uRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }

    await pool.query('UPDATE users SET role_id = ?, updated_at = NOW() WHERE id = ?', [roleId, userId]);
    await logAudit(req, 'ASSIGN_USER_ROLE', 'users', userId, { role_id: roleId, role_name: rRows[0].name });

    res.json({
      success: true,
      message: `${uRows[0].name} berhasil dimasukkan ke dalam role ${rRows[0].name}.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/v1/admin/roles-matrix -> Simpan perubahan matrix hak akses per role
router.put('/roles-matrix', requireRole('Admin'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const roleId = Number(req.body?.role_id);
    const items = req.body?.permissions;
    if (!Number.isInteger(roleId) || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Data role_id dan permissions wajib diisi.' });
    }

    await conn.beginTransaction();
    for (const item of items) {
      const menuId = Number(item.menu_id);
      if (!Number.isInteger(menuId)) continue;
      const canRead = item.can_read ? 1 : 0;
      const canCreate = item.can_create ? 1 : 0;
      const canUpdate = item.can_update ? 1 : 0;
      const canDelete = item.can_delete ? 1 : 0;

      await conn.query(
        `INSERT INTO role_menu_permissions (role_id, menu_id, can_read, can_create, can_update, can_delete)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           can_read = VALUES(can_read),
           can_create = VALUES(can_create),
           can_update = VALUES(can_update),
           can_delete = VALUES(can_delete)`,
        [roleId, menuId, canRead, canCreate, canUpdate, canDelete]
      );
    }
    await conn.commit();

    await logAudit(req, 'UPDATE_ROLE_PERMISSIONS', 'roles', roleId, { count: items.length });
    res.json({ success: true, message: 'Hak akses role berhasil diperbarui!' });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

// 3. USERS CRUD (/api/v1/admin/users)
router.get('/users', async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT u.id, u.role_id, u.outlet_id, u.name, u.email, u.is_active, u.last_login_at, u.created_at,
             r.name AS role_name, o.name AS outlet_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN outlets o ON u.outlet_id = o.id
      ORDER BY u.id ASC
    `);
    const [roles] = await pool.query('SELECT id, name, description FROM roles WHERE is_active = 1 ORDER BY id ASC');
    const [outlets] = await pool.query('SELECT id, code, name FROM outlets WHERE is_active = 1 ORDER BY id ASC');
    res.json({ success: true, data: { users, roles, outlets } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/users', requireRole('Admin'), async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '').trim();
    const roleId = Number(req.body?.role_id);
    const outletId = Number(req.body?.outlet_id) || 1;

    if (!name || !email || password.length < 4 || !Number.isInteger(roleId)) {
      return res.status(400).json({ success: false, message: 'Nama, email, role, dan password (min 4 karakter) wajib diisi.' });
    }

    const [dup] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (dup.length > 0) {
      return res.status(409).json({ success: false, message: 'Email sudah digunakan oleh akun lain.' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const [info] = await pool.query(
      `INSERT INTO users (role_id, outlet_id, name, email, password_hash, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [roleId, outletId, name, email, hash]
    );
    await logAudit(req, 'CREATE_USER', 'users', info.insertId, { name, email, roleId });
    res.status(201).json({ success: true, message: 'User baru berhasil ditambahkan!', data: { id: info.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/users/:id', requireRole('Admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const name = String(req.body?.name || '').trim();
    const roleId = Number(req.body?.role_id);
    const outletId = Number(req.body?.outlet_id) || 1;
    const isActive = req.body?.is_active ? 1 : 0;
    const newPassword = String(req.body?.password || '').trim();

    if (!Number.isInteger(id) || !name || !Number.isInteger(roleId)) {
      return res.status(400).json({ success: false, message: 'Data user tidak valid.' });
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'Password baru minimal 6 karakter.' });
      }
      await pool.query(
        'UPDATE users SET name = ?, role_id = ?, outlet_id = ?, is_active = ?, password_hash = ?, updated_at = NOW() WHERE id = ?',
        [name, roleId, outletId, isActive, bcrypt.hashSync(newPassword, 10), id]
      );
    } else {
      await pool.query(
        'UPDATE users SET name = ?, role_id = ?, outlet_id = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
        [name, roleId, outletId, isActive, id]
      );
    }

    await logAudit(req, 'UPDATE_USER', 'users', id, { name, roleId, isActive });
    res.json({ success: true, message: 'Data user berhasil diperbarui!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. MENUS CRUD (/api/v1/admin/menus)
router.get('/menus', async (req, res) => {
  try {
    const [menus] = await pool.query('SELECT * FROM menus ORDER BY sort_order ASC, id ASC');
    res.json({ success: true, data: menus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/menus/:id', requireRole('Admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const label = String(req.body?.label || '').trim();
    const sortOrder = Number(req.body?.sort_order) || 0;
    const isActive = req.body?.is_active ? 1 : 0;

    if (!Number.isInteger(id) || !label) {
      return res.status(400).json({ success: false, message: 'Label menu wajib diisi.' });
    }
    await pool.query(
      'UPDATE menus SET label = ?, sort_order = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
      [label, sortOrder, isActive, id]
    );
    await logAudit(req, 'UPDATE_MENU', 'menus', id, { label, sortOrder, isActive });
    res.json({ success: true, message: 'Menu berhasil diperbarui!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. PRODUCTS & BUSINESS UNITS CRUD (/api/v1/admin/catalog)
router.get('/catalog', async (req, res) => {
  try {
    const [products] = await pool.query(`
      SELECT p.*, p.play_minutes AS duration_minutes, p.tolerance_minutes AS grace_period_minutes,
             bu.code AS unit_code, bu.name AS unit_name
      FROM products p
      JOIN business_units bu ON p.business_unit_id = bu.id
      WHERE p.sku <> 'OT-FEE'
      ORDER BY p.business_unit_id ASC, p.base_price ASC
    `);
    const [units] = await pool.query('SELECT * FROM business_units ORDER BY id ASC');
    res.json({ success: true, data: { products, units, business_units: units } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/products', requireRole('Admin', 'Client'), async (req, res) => {
  try {
    const category = String(req.body?.category || 'PLAYGROUND').toUpperCase();
    const unitId = Number(req.body?.business_unit_id) || (category === 'CAFE' ? 5 : 1);
    const sku = String(req.body?.sku || `${category === 'CAFE' ? 'CF' : 'PG'}-${Date.now().toString().slice(-4)}`).trim().toUpperCase();
    const name = String(req.body?.name || '').trim();
    const productType = String(req.body?.product_type || (category === 'CAFE' ? 'fnb' : 'ticket'));
    const basePrice = Number(req.body?.base_price);
    const isOpenPlay = req.body?.is_open_play ? 1 : 0;
    const playMinutes = isOpenPlay || productType === 'fnb' ? null : (Number(req.body?.play_minutes || req.body?.duration_minutes) || 60);
    const maxReentry = productType === 'fnb' ? 0 : (Number(req.body?.max_reentry) ?? 2);
    const toleranceMinutes = productType === 'fnb' ? 0 : (Number(req.body?.tolerance_minutes || req.body?.grace_period_minutes) ?? 10);

    if (!sku || !name || !Number.isFinite(basePrice) || basePrice < 0) {
      return res.status(400).json({ success: false, message: 'SKU, Nama Produk, dan Harga wajib valid.' });
    }

    const [info] = await pool.query(
      `INSERT INTO products (business_unit_id, sku, name, product_type, base_price, play_minutes, is_open_play, covers_children, covers_companions, max_reentry, tolerance_minutes, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [unitId, sku, name, productType, basePrice, playMinutes, isOpenPlay, productType === 'fnb' ? 0 : 1, productType === 'fnb' ? 0 : 1, maxReentry, toleranceMinutes]
    );
    await logAudit(req, 'CREATE_PRODUCT', 'products', info.insertId, { sku, name, basePrice });
    res.status(201).json({ success: true, message: 'Produk baru berhasil ditambahkan!', data: { id: info.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/products/:id', requireRole('Admin', 'Client'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const name = String(req.body?.name || '').trim();
    const basePrice = Number(req.body?.base_price);
    const isActive = req.body?.is_active ? 1 : 0;

    if (!Number.isInteger(id) || !name || !Number.isFinite(basePrice) || basePrice < 0) {
      return res.status(400).json({ success: false, message: 'Nama dan harga produk wajib valid.' });
    }

    await pool.query(
      'UPDATE products SET name = ?, base_price = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
      [name, basePrice, isActive, id]
    );
    await logAudit(req, 'UPDATE_PRODUCT', 'products', id, { name, basePrice, isActive });
    res.json({ success: true, message: 'Produk berhasil diperbarui!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. MEMBERS, CARDS, PLANS & VOUCHERS (/api/v1/admin/members-promo)
router.get('/members-promo', async (req, res) => {
  try {
    const [members] = await pool.query(`
      SELECT m.*, m.name AS full_name, m.balance AS wallet_balance, mc.card_uid, mc.status AS card_status
      FROM members m
      LEFT JOIN member_cards mc ON mc.member_id = m.id AND mc.status = 'active'
      ORDER BY m.id DESC
    `);
    const [plans] = await pool.query('SELECT *, valid_days AS duration_days FROM membership_plans ORDER BY price ASC');
    const [vouchers] = await pool.query('SELECT *, min_purchase AS min_order_amount, usage_limit AS quota FROM vouchers ORDER BY id DESC');
    res.json({ success: true, data: { members, plans, vouchers } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/members', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const name = String(req.body?.name || req.body?.full_name || '').trim();
    const phone = String(req.body?.phone || '').trim();
    const email = String(req.body?.email || '').trim() || null;
    const cardUid = String(req.body?.card_uid || '').trim();
    const initialBalance = Math.max(0, Number(req.body?.initial_balance) || 0);

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Nama dan No. HP member wajib diisi.' });
    }

    await conn.beginTransaction();
    const code = 'MBR-' + Date.now().toString().slice(-6);
    const [mInfo] = await conn.query(
      `INSERT INTO members (member_code, name, phone, email, registered_outlet_id, balance, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
      [code, name, phone, email, req.user.outlet_id || 1, initialBalance]
    );

    if (cardUid) {
      await conn.query(
        `INSERT INTO member_cards (member_id, card_uid, status, issued_at, created_at)
         VALUES (?, ?, 'active', NOW(), NOW())`,
        [mInfo.insertId, cardUid]
      );
    }
    await conn.commit();
    res.status(201).json({ success: true, message: 'Member berhasil didaftarkan!', data: { id: mInfo.insertId, member_code: code } });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

router.post('/members/:id/topup', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const amount = Number(req.body?.amount);
    if (!Number.isInteger(id) || !Number.isFinite(amount) || amount < 10000) {
      return res.status(400).json({ success: false, message: 'Nominal top-up minimal Rp 10.000.' });
    }
    await pool.query('UPDATE members SET balance = balance + ?, updated_at = NOW() WHERE id = ?', [amount, id]);
    const [mRows] = await pool.query('SELECT balance FROM members WHERE id = ?', [id]);
    await logAudit(req, 'TOPUP_MEMBER', 'members', id, { amount });
    res.json({
      success: true,
      message: `Top-up saldo Rp ${amount.toLocaleString('id-ID')} berhasil ditambahkan!`,
      data: { new_balance: mRows[0]?.balance || amount }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/vouchers', requireRole('Admin', 'Client'), async (req, res) => {
  try {
    const code = String(req.body?.code || '').trim().toUpperCase();
    const name = String(req.body?.name || '').trim();
    const discountType = req.body?.discount_type === 'fixed' ? 'fixed' : 'percent';
    const discountValue = Number(req.body?.discount_value);
    const minPurchase = Math.max(0, Number(req.body?.min_purchase) || 0);
    const usageLimit = Math.max(1, Number(req.body?.usage_limit) || 100);

    if (!code || !name || !Number.isFinite(discountValue) || discountValue <= 0) {
      return res.status(400).json({ success: false, message: 'Kode, nama, dan nilai diskon voucher wajib valid.' });
    }
    if (discountType === 'percent' && discountValue > 100) {
      return res.status(400).json({ success: false, message: 'Diskon persen maksimal 100%.' });
    }

    const [info] = await pool.query(
      `INSERT INTO vouchers (code, name, discount_type, discount_value, min_purchase, max_discount, valid_from, valid_until, usage_limit, used_count, outlet_id, stackable_with_member, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 90 DAY), ?, 0, 1, 1, 1, NOW(), NOW())`,
      [code, name, discountType, discountValue, minPurchase, discountType === 'fixed' ? discountValue : 100000, usageLimit]
    );
    await logAudit(req, 'CREATE_VOUCHER', 'vouchers', info.insertId, { code, discountType, discountValue });
    res.status(201).json({ success: true, message: 'Voucher promo berhasil dibuat!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. BOOKINGS & REGISTRATIONS (/api/v1/admin/bookings)
router.get('/bookings', async (req, res) => {
  try {
    const [bookings] = await pool.query(`
      SELECT b.*, b.booking_no AS booking_code, b.contact_name AS customer_name, b.contact_phone AS customer_phone,
             b.event_date AS booking_date, b.pax_count AS guest_count, b.deposit_amount AS total, p.name AS package_name
      FROM bookings b
      LEFT JOIN products p ON b.package_product_id = p.id
      ORDER BY b.event_date DESC, b.id DESC LIMIT 50
    `);
    res.json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/bookings', async (req, res) => {
  try {
    const contactName = String(req.body?.contact_name || req.body?.customer_name || '').trim();
    const contactPhone = String(req.body?.contact_phone || req.body?.customer_phone || '').trim();
    const eventDate = String(req.body?.event_date || req.body?.booking_date || '').trim();
    const paxCount = Math.max(1, Number(req.body?.pax_count || req.body?.guest_count) || 10);
    const celebrantName = String(req.body?.celebrant_name || '').trim() || null;
    const depositAmount = Math.max(0, Number(req.body?.deposit_amount || req.body?.total) || 0);

    if (!contactName || !contactPhone || !eventDate) {
      return res.status(400).json({ success: false, message: 'Nama kontak, No. HP, dan Tanggal Acara wajib diisi.' });
    }

    const bookingNo = 'BKG-' + Date.now().toString().slice(-6);
    await pool.query(
      `INSERT INTO bookings (booking_no, outlet_id, booking_type, contact_name, contact_phone, event_date, start_time, end_time, pax_count, celebrant_name, status, deposit_amount, created_by, created_at, updated_at)
       VALUES (?, 1, 'birthday', ?, ?, ?, '10:00:00', '13:00:00', ?, ?, 'confirmed', ?, ?, NOW(), NOW())`,
      [bookingNo, contactName, contactPhone, eventDate, paxCount, celebrantName, depositAmount, req.user.id]
    );
    res.status(201).json({ success: true, message: `Booking #${bookingNo} berhasil dijadwalkan!` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 8. SYSTEM DATA (Outlets, Gates, Settings, Audit Logs, Item Sales Report)
router.get('/system-data', async (req, res) => {
  try {
    const [outlets] = await pool.query('SELECT * FROM outlets ORDER BY id ASC');
    const [gates] = await pool.query('SELECT id, outlet_id, code, name, direction, is_active, last_seen_at AS last_heartbeat_at, created_at FROM gates ORDER BY id ASC');
    const [settings] = await pool.query('SELECT *, setting_key AS key_name, setting_value AS value_json FROM settings ORDER BY id ASC');
    const [auditLogs] = await pool.query(`
      SELECT al.*, u.name AS user_name, u.email AS user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.id DESC LIMIT 50
    `);
    const [itemSales] = await pool.query(`
      SELECT p.id, oi.product_name AS name, p.sku, bu.name AS unit_name, SUM(oi.quantity) AS total_qty, SUM(oi.line_total) AS total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id AND o.status = 'paid'
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN business_units bu ON p.business_unit_id = bu.id
      GROUP BY p.id, oi.product_name, p.sku, bu.name
      ORDER BY total_revenue DESC
    `);

    res.json({
      success: true,
      data: { outlets, gates, settings, audit_logs: auditLogs, item_sales: itemSales }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/settings', requireRole('Admin', 'Client'), async (req, res) => {
  try {
    if (req.body?.key_name) {
      await pool.query('UPDATE settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = ?', [String(req.body.value_json ?? ''), String(req.body.key_name)]);
      return res.json({ success: true, message: 'Pengaturan berhasil disimpan!' });
    }
    const items = req.body?.settings;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Data settings wajib berupa array.' });
    }
    for (const s of items) {
      await pool.query('UPDATE settings SET setting_value = ?, updated_at = NOW() WHERE id = ?', [String(s.setting_value), Number(s.id)]);
    }
    await logAudit(req, 'UPDATE_SETTINGS', 'settings', 0, items);
    res.json({ success: true, message: 'Pengaturan operasional berhasil disimpan!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
