import mysql from 'mysql2/promise';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQLITE_PATH = path.join(__dirname, '..', 'data', 'playtopia_id.sqlite');

export const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
export const DEMO_GATE_KEY = process.env.DEMO_GATE_KEY || 'DEMO-GATE-KEY-01';

const DEMO_USERS = [
  { role_id: 2, name: 'Administrator Playtopia', email: 'admin@playtopia.id', password: 'admin123' },
  { role_id: 1, name: 'Owner Playtopia', email: 'owner@playtopia.id', password: 'owner123' },
  { role_id: 3, name: 'Kasir Utama', email: 'kasir@playtopia.id', password: 'kasir123' }
];

// Daftar lengkap 35 Menu & Grup Menu sesuai tabel `menus` di MySQL playtopia_id
const DEFAULT_MENUS = [
  // Top-level groups & standalone
  [1, null, 'dashboard', 'Dashboard', 'bi-speedometer2', '/dashboard', 1, 0, 1],
  [2, null, 'grp_pos', 'Point of Sale', 'bi-cart4', null, 2, 1, 1],
  [3, null, 'grp_access', 'Access Control', 'bi-shield-check', null, 3, 1, 1],
  [4, null, 'grp_members', 'Members & Promo', 'bi-people', null, 4, 1, 1],
  [5, null, 'grp_booking', 'Booking', 'bi-calendar-event', null, 5, 1, 1],
  [6, null, 'grp_catalog', 'Catalog', 'bi-box-seam', null, 6, 1, 1],
  [7, null, 'grp_reports', 'Reports', 'bi-bar-chart-line', null, 7, 1, 1],
  [8, null, 'grp_system', 'System', 'bi-gear', null, 8, 1, 1],
  // Children of grp_pos (2)
  [9, 2, 'pos_cashier', 'Kasir POS', 'bi-cash-stack', '/pos', 1, 0, 1],
  [10, 2, 'orders', 'Daftar Transaksi', 'bi-receipt', '/orders', 2, 0, 1],
  [11, 2, 'payments', 'Rekonsiliasi Pembayaran', 'bi-credit-card', '/payments', 3, 0, 1],
  [12, 2, 'shifts', 'Shift & Closing Kasir', 'bi-clock-history', '/closing', 4, 0, 1],
  // Children of grp_access (3)
  [13, 3, 'access_scan', 'Simulator Gate & Turnstile', 'bi-qr-code-scan', '/simulator', 1, 0, 1],
  [14, 3, 'tickets', 'Monitoring Pengunjung Aktif', 'bi-ticket-perforated', '/visitors', 2, 0, 1],
  [15, 3, 'access_logs', 'Log Akses Turnstile', 'bi-journal-text', '/access/logs', 3, 0, 1],
  [16, 3, 'gates', 'Perangkat Gate', 'bi-door-open', '/gates', 4, 0, 1],
  // Children of grp_members (4)
  [17, 4, 'members', 'Direktori Member', 'bi-person-badge', '/members', 1, 0, 1],
  [18, 4, 'member_cards', 'Kartu RFID & Top-Up', 'bi-credit-card-2-front', '/member-cards', 2, 0, 1],
  [19, 4, 'membership_plans', 'Paket Membership', 'bi-award', '/membership-plans', 3, 0, 1],
  [20, 4, 'vouchers', 'Voucher & Promo Diskon', 'bi-percent', '/vouchers', 4, 0, 1],
  // Children of grp_booking (5)
  [21, 5, 'bookings', 'Reservasi Rombongan & Ultah', 'bi-calendar2-heart', '/bookings', 1, 0, 1],
  [22, 5, 'registrations', 'Registrasi Online', 'bi-phone', '/registrations', 2, 0, 1],
  // Children of grp_catalog (6)
  [23, 6, 'products', 'Produk & Paket Tiket', 'bi-tags', '/products', 1, 0, 1],
  [24, 6, 'business_units', 'Unit Bisnis', 'bi-shop', '/business-units', 2, 0, 1],
  // Children of grp_reports (7)
  [25, 7, 'sales_report', 'Laporan Penjualan', 'bi-graph-up-arrow', '/reports/sales', 1, 0, 1],
  [26, 7, 'item_report', 'Laporan per Item', 'bi-pie-chart', '/reports/items', 2, 0, 1],
  [27, 7, 'closing', 'Rekap Closing Harian', 'bi-file-earmark-check', '/closing', 3, 0, 1],
  // Children of grp_system (8)
  [28, 8, 'roles', 'Role & Hak Akses Menu', 'bi-shield-lock', '/system/roles', 1, 0, 1],
  [29, 8, 'menus', 'Struktur Grup Menu', 'bi-list-nested', '/system/menus', 2, 0, 1],
  [30, 8, 'users', 'Manajemen Pengguna', 'bi-people-fill', '/system/users', 3, 0, 1],
  [31, 8, 'outlets', 'Cabang Outlet', 'bi-building', '/system/outlets', 4, 0, 1],
  [32, 8, 'settings', 'Pengaturan Operasional', 'bi-sliders', '/system/settings', 5, 0, 1],
  [33, 8, 'audit_logs', 'Audit Log Sistem', 'bi-activity', '/system/audit-logs', 6, 0, 1]
];

const mysqlPool = mysql.createPool({
  host: process.env.DB_HOST || '100.113.174.74',
  user: process.env.DB_USER || 'wandi',
  password: process.env.DB_PASSWORD || 'wandi123',
  database: process.env.DB_NAME || 'playtopia_id',
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 2500,
  enableKeepAlive: true,
  decimalNumbers: true
});

let sqliteDb = null;
let useSqliteFallback = false;

function initSqliteFallback() {
  if (sqliteDb) return sqliteDb;
  fs.mkdirSync(path.dirname(SQLITE_PATH), { recursive: true });
  sqliteDb = new DatabaseSync(SQLITE_PATH);

  // Register custom SQL functions so MySQL queries work identically in SQLite
  sqliteDb.function('NOW', () => new Date().toISOString().slice(0, 19).replace('T', ' '));
  sqliteDb.function('CURDATE', () => new Date().toISOString().slice(0, 10));
  sqliteDb.function('IF', (cond, a, b) => (cond ? a : b));
  sqliteDb.function('FORMAT', (num) => Number(num || 0).toLocaleString('id-ID'));
  sqliteDb.function('CONCAT', (...args) => args.map(a => (a ?? '')).join(''));

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      is_active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS menus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER,
      code TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      icon TEXT,
      route TEXT,
      sort_order INTEGER DEFAULT 0,
      is_group INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS role_menu_permissions (
      role_id INTEGER NOT NULL,
      menu_id INTEGER NOT NULL,
      can_create INTEGER DEFAULT 0,
      can_read INTEGER DEFAULT 1,
      can_update INTEGER DEFAULT 0,
      can_delete INTEGER DEFAULT 0,
      PRIMARY KEY (role_id, menu_id)
    );
    CREATE TABLE IF NOT EXISTS outlets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      address TEXT,
      city TEXT,
      phone TEXT,
      timezone TEXT DEFAULT 'Asia/Jakarta',
      is_active INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id INTEGER NOT NULL,
      outlet_id INTEGER DEFAULT 1,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      password_hash TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      last_login_at TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS business_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      is_active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_unit_id INTEGER NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      product_type TEXT DEFAULT 'ticket',
      base_price REAL NOT NULL DEFAULT 0,
      play_minutes INTEGER,
      is_open_play INTEGER DEFAULT 0,
      covers_children INTEGER DEFAULT 1,
      covers_companions INTEGER DEFAULT 1,
      max_reentry INTEGER DEFAULT 2,
      tolerance_minutes INTEGER DEFAULT 10,
      is_active INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      outlet_id INTEGER DEFAULT 1,
      user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'open',
      opened_at TEXT,
      closed_at TEXT,
      opening_cash REAL DEFAULT 0,
      expected_cash REAL DEFAULT 0,
      counted_cash REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,
      outlet_id INTEGER DEFAULT 1,
      shift_id INTEGER,
      cashier_id INTEGER,
      member_id INTEGER,
      source TEXT DEFAULT 'pos',
      status TEXT DEFAULT 'paid',
      customer_name TEXT,
      subtotal REAL DEFAULT 0,
      member_discount REAL DEFAULT 0,
      voucher_discount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      qty INTEGER GENERATED ALWAYS AS (quantity) VIRTUAL,
      line_discount REAL DEFAULT 0,
      line_total REAL GENERATED ALWAYS AS ((unit_price * quantity) - line_discount) VIRTUAL,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      method TEXT NOT NULL,
      source TEXT DEFAULT 'manual',
      status TEXT DEFAULT 'paid',
      amount REAL NOT NULL,
      cash_received REAL,
      change_amount REAL,
      card_last4 TEXT,
      approval_code TEXT,
      midtrans_order_id TEXT,
      paid_at TEXT,
      created_by INTEGER,
      confirmed_by INTEGER,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_code TEXT NOT NULL UNIQUE,
      order_id INTEGER,
      order_item_id INTEGER,
      outlet_id INTEGER DEFAULT 1,
      product_id INTEGER NOT NULL,
      member_id INTEGER,
      status TEXT DEFAULT 'unused',
      valid_date TEXT,
      play_minutes INTEGER,
      tolerance_minutes INTEGER DEFAULT 10,
      max_reentry INTEGER DEFAULT 2,
      reentries_used INTEGER DEFAULT 0,
      first_in_at TEXT,
      last_out_at TEXT,
      ends_at TEXT,
      overtime_minutes INTEGER DEFAULT 0,
      overtime_fee REAL DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS gates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      outlet_id INTEGER DEFAULT 1,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      direction TEXT DEFAULT 'IN',
      api_key_hash TEXT,
      is_active INTEGER DEFAULT 1,
      last_seen_at TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS access_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gate_id INTEGER DEFAULT 1,
      outlet_id INTEGER DEFAULT 1,
      ticket_id INTEGER,
      member_id INTEGER,
      scanned_code TEXT,
      credential_value TEXT GENERATED ALWAYS AS (scanned_code) VIRTUAL,
      direction TEXT,
      result TEXT,
      deny_reason TEXT,
      passed INTEGER DEFAULT 0,
      scanned_at TEXT
    );
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      registered_outlet_id INTEGER DEFAULT 1,
      balance REAL DEFAULT 0,
      points_balance INTEGER DEFAULT 120,
      tier TEXT DEFAULT 'GOLD',
      discount_percent REAL DEFAULT 10,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS member_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      card_uid TEXT NOT NULL UNIQUE,
      status TEXT DEFAULT 'active',
      issued_at TEXT,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS membership_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      discount_percent REAL DEFAULT 10,
      valid_days INTEGER DEFAULT 90,
      duration_days INTEGER GENERATED ALWAYS AS (valid_days) VIRTUAL,
      included_entries INTEGER DEFAULT 5,
      is_active INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS vouchers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      discount_type TEXT DEFAULT 'percent',
      discount_value REAL NOT NULL,
      min_purchase REAL DEFAULT 0,
      min_order_amount REAL GENERATED ALWAYS AS (min_purchase) VIRTUAL,
      max_discount REAL DEFAULT 50000,
      valid_from TEXT,
      valid_until TEXT,
      usage_limit INTEGER DEFAULT 100,
      quota INTEGER GENERATED ALWAYS AS (usage_limit) VIRTUAL,
      used_count INTEGER DEFAULT 0,
      outlet_id INTEGER DEFAULT 1,
      stackable_with_member INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_no TEXT NOT NULL UNIQUE,
      outlet_id INTEGER DEFAULT 1,
      booking_type TEXT DEFAULT 'birthday',
      package_product_id INTEGER,
      contact_name TEXT NOT NULL,
      contact_phone TEXT NOT NULL,
      event_date TEXT NOT NULL,
      start_time TEXT DEFAULT '10:00:00',
      end_time TEXT DEFAULT '13:00:00',
      pax_count INTEGER DEFAULT 15,
      celebrant_name TEXT,
      status TEXT DEFAULT 'confirmed',
      deposit_amount REAL DEFAULT 1500000,
      created_by INTEGER,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS online_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_code TEXT,
      visitor_name TEXT,
      phone TEXT,
      visit_date TEXT,
      status TEXT DEFAULT 'verified',
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      outlet_id INTEGER DEFAULT 1,
      setting_key TEXT NOT NULL UNIQUE,
      setting_value TEXT,
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      outlet_id INTEGER DEFAULT 1,
      action TEXT,
      entity_type TEXT,
      entity_id TEXT,
      new_data TEXT,
      ip_address TEXT,
      created_at TEXT
    );
  `);

  // Seed Roles, Business Units, Menus, Role Menu Permissions, Settings in SQLite
  const roleCount = sqliteDb.prepare('SELECT count(*) as c FROM roles').get().c;
  if (roleCount === 0) {
    sqliteDb.exec(`
      INSERT INTO roles (id, name, description, is_active) VALUES
      (1, 'Client', 'Owner / Eksekutif Playtopia (Laporan, Analitik, Operasional)', 1),
      (2, 'Admin', 'Administrator Sistem (Akses Penuh Seluruh Grup Menu & RBAC)', 1),
      (3, 'Staff', 'Kasir POS & Petugas Gate Operasional', 1);
    `);
  }

  const buCount = sqliteDb.prepare('SELECT count(*) as c FROM business_units').get().c;
  if (buCount === 0) {
    sqliteDb.exec(`
      INSERT INTO business_units (id, code, name, is_active) VALUES
      (1, 'PLAYGROUND', 'Playtopia Playground & Wahana', 1),
      (5, 'CAFE', 'Playtopia Cafe & Snack Bar', 1);
    `);
  }

  const menuCount = sqliteDb.prepare('SELECT count(*) as c FROM menus').get().c;
  if (menuCount === 0) {
    const insMenu = sqliteDb.prepare(
      'INSERT INTO menus (id, parent_id, code, label, icon, route, sort_order, is_group, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const m of DEFAULT_MENUS) insMenu.run(...m);
  }

  const permCount = sqliteDb.prepare('SELECT count(*) as c FROM role_menu_permissions').get().c;
  if (permCount === 0) {
    const insPerm = sqliteDb.prepare(
      'INSERT INTO role_menu_permissions (role_id, menu_id, can_create, can_read, can_update, can_delete) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const m of DEFAULT_MENUS) {
      const menuId = m[0];
      const code = m[2];
      // Role 2: Admin -> Full access to all 33 menus
      insPerm.run(2, menuId, 1, 1, 1, 1);
      // Role 1: Client (Owner) -> All except low-level role matrix mutation
      const clientRead = 1;
      const clientWrite = ['roles', 'menus'].includes(code) ? 0 : 1;
      insPerm.run(1, menuId, clientWrite, clientRead, clientWrite, 0);
      // Role 3: Staff (Kasir) -> POS, Access Control, Members, Booking
      const staffMenus = [
        'grp_pos', 'pos_cashier', 'orders', 'payments', 'shifts',
        'grp_access', 'access_scan', 'tickets', 'access_logs',
        'grp_members', 'members', 'member_cards', 'vouchers',
        'grp_booking', 'bookings', 'registrations'
      ];
      const isStaffAllowed = staffMenus.includes(code) ? 1 : 0;
      insPerm.run(3, menuId, isStaffAllowed, isStaffAllowed, isStaffAllowed, 0);
    }
  }

  const setCount = sqliteDb.prepare('SELECT count(*) as c FROM settings').get().c;
  if (setCount === 0) {
    sqliteDb.exec(`
      INSERT INTO settings (outlet_id, setting_key, setting_value, updated_at) VALUES
      (1, 'grace_period_minutes', '10', NOW()),
      (1, 'overtime_block_minutes', '30', NOW()),
      (1, 'overtime_fee_per_block', '15000', NOW()),
      (1, 'max_reentry_default', '2', NOW());
    `);
  }

  return sqliteDb;
}

// Translate MySQL SQL queries into SQLite-compatible SQL
function translateSqlForSqlite(sql, params = []) {
  let q = sql.trim();
  const outParams = [];

  // Expand `IN (?)` when parameter is an array
  const parts = q.split('?');
  if (parts.length - 1 === params.length) {
    let rebuilt = parts[0];
    for (let i = 0; i < params.length; i++) {
      const val = params[i];
      if (Array.isArray(val)) {
        rebuilt += val.map(() => '?').join(', ') + parts[i + 1];
        outParams.push(...val);
      } else {
        rebuilt += '?' + parts[i + 1];
        outParams.push(val === undefined ? null : val);
      }
    }
    q = rebuilt;
  } else {
    outParams.push(...params);
  }

  q = q
    .replace(/\bFOR UPDATE\b/gi, '')
    .replace(/GROUP_CONCAT\(([^)]+?)\s+SEPARATOR\s+('[^']*')\)/gi, 'GROUP_CONCAT($1, $2)')
    .replace(/DATE_ADD\(NOW\(\),\s*INTERVAL\s*\(play_minutes\s*\+\s*tolerance_minutes\)\s*MINUTE\)/gi,
      "datetime(NOW(), '+' || (COALESCE(play_minutes, 60) + COALESCE(tolerance_minutes, 10)) || ' minutes')")
    .replace(/DATE_ADD\(NOW\(\),\s*INTERVAL\s*(\d+)\s*DAY\)/gi, "datetime(NOW(), '+$1 days')")
    .replace(/DATE_ADD\(NOW\(\),\s*INTERVAL\s*(\d+)\s*MINUTE\)/gi, "datetime(NOW(), '+$1 minutes')")
    .replace(/DATE_SUB\(NOW\(\),\s*INTERVAL\s*\?\s*MINUTE\)/gi, "datetime(NOW(), '-' || ? || ' minutes')")
    .replace(/DATE_ADD\(ends_at,\s*INTERVAL\s*COALESCE\(tolerance_minutes,\s*10\)\s*MINUTE\)/gi,
      "datetime(ends_at, '+' || COALESCE(tolerance_minutes, 10) || ' minutes')")
    .replace(/ON DUPLICATE KEY UPDATE\s+can_read\s*=\s*VALUES\(can_read\),\s*can_create\s*=\s*VALUES\(can_create\),\s*can_update\s*=\s*VALUES\(can_update\),\s*can_delete\s*=\s*VALUES\(can_delete\)/gi,
      'ON CONFLICT(role_id, menu_id) DO UPDATE SET can_read = excluded.can_read, can_create = excluded.can_create, can_update = excluded.can_update, can_delete = excluded.can_delete');

  return { query: q, params: outParams };
}

function executeSqlite(sql, params = []) {
  const db = initSqliteFallback();
  const { query, params: bound } = translateSqlForSqlite(sql, params);
  const isSelect = /^\s*(SELECT|PRAGMA)/i.test(query);
  const stmt = db.prepare(query);
  if (isSelect) {
    const rows = stmt.all(...bound);
    return [rows, []];
  } else {
    const info = stmt.run(...bound);
    return [{ insertId: Number(info.lastInsertRowid), affectedRows: Number(info.changes) }, []];
  }
}

export const pool = {
  async query(sql, params = []) {
    if (!useSqliteFallback) {
      try {
        return await mysqlPool.query(sql, params);
      } catch (err) {
        if (['ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'PROTOCOL_CONNECTION_LOST'].includes(err.code) || /ETIMEDOUT|ECONNREFUSED/i.test(err.message)) {
          console.warn(`⚠️ MySQL (${process.env.DB_HOST || '100.113.174.74'}) unreachable (${err.code || err.message}). Switching to local SQLite mirror playtopia_id.sqlite.`);
          useSqliteFallback = true;
          await seedSqliteData();
        } else {
          throw err;
        }
      }
    }
    return executeSqlite(sql, params);
  },

  async getConnection() {
    if (!useSqliteFallback) {
      try {
        return await mysqlPool.getConnection();
      } catch (err) {
        if (['ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'PROTOCOL_CONNECTION_LOST'].includes(err.code) || /ETIMEDOUT|ECONNREFUSED/i.test(err.message)) {
          console.warn(`⚠️ MySQL (${process.env.DB_HOST || '100.113.174.74'}) unreachable. Using local SQLite connection.`);
          useSqliteFallback = true;
          await seedSqliteData();
        } else {
          throw err;
        }
      }
    }
    return {
      query: async (sql, params = []) => executeSqlite(sql, params),
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {},
      release: () => {}
    };
  }
};

async function seedSqliteData() {
  initSqliteFallback();
  await runSeedQueries({
    query: async (sql, params = []) => executeSqlite(sql, params)
  });
}

async function runSeedQueries(conn) {
  // 1. Outlet
  const [outlets] = await conn.query('SELECT count(*) as count FROM outlets');
  if (outlets[0].count === 0) {
    await conn.query(`
      INSERT INTO outlets (id, code, name, address, city, phone, timezone, is_active, created_at, updated_at)
      VALUES (1, 'OUTLET-01', 'Playtopia Senayan Park', 'Senayan Park Mall Lt. 2', 'Jakarta Pusat', '021-5551234', 'Asia/Jakarta', 1, NOW(), NOW())
    `);
  }

  // 2. Users (Admin, Owner, Kasir)
  for (const u of DEMO_USERS) {
    const [rows] = await conn.query('SELECT id, password_hash, role_id FROM users WHERE email = ?', [u.email]);
    if (rows.length === 0) {
      await conn.query(
        `INSERT INTO users (role_id, outlet_id, name, email, password_hash, is_active, created_at, updated_at)
         VALUES (?, 1, ?, ?, ?, 1, NOW(), NOW())`,
        [u.role_id, u.name, u.email, bcrypt.hashSync(u.password, 10)]
      );
    } else if (!String(rows[0].password_hash).startsWith('$2')) {
      await conn.query('UPDATE users SET password_hash = ?, role_id = ? WHERE id = ?', [bcrypt.hashSync(u.password, 10), u.role_id, rows[0].id]);
    }
  }

  // 3. Gates
  const gateHash = sha256(DEMO_GATE_KEY);
  const [gates] = await conn.query('SELECT count(*) as count FROM gates');
  if (gates[0].count === 0) {
    await conn.query(`
      INSERT INTO gates (id, outlet_id, code, name, direction, api_key_hash, is_active, created_at, updated_at)
      VALUES
      (1, 1, 'GATE-IN-01', 'Tripod Turnstile Masuk (IN)', 'IN', ?, 1, NOW(), NOW()),
      (2, 1, 'GATE-OUT-01', 'Tripod Turnstile Keluar (OUT)', 'OUT', ?, 1, NOW(), NOW())
    `, [gateHash, gateHash]);
  }

  // 4. Products
  const [products] = await conn.query('SELECT count(*) as count FROM products');
  if (products[0].count === 0) {
    const items = [
      [1, 'PG-1H', 'Paket Bermain 1 Jam', 'ticket', 50000, 60, 0, 1, 1, 2, 10],
      [1, 'PG-2H', 'Paket Bermain 2 Jam', 'ticket', 80000, 120, 0, 1, 1, 2, 10],
      [1, 'PG-MAX', 'Paket Bermain Sepuasnya (All-Day)', 'ticket', 120000, null, 1, 1, 1, 2, 10],
      [1, 'PG-PARTY', 'Paket Group / Ulang Tahun (10 Anak)', 'package', 1200000, 180, 0, 10, 5, 2, 10],
      [5, 'CF-FRIES', 'Kentang Goreng (French Fries)', 'fnb', 25000, null, 0, 0, 0, 0, 0],
      [5, 'CF-NUGGET', 'Crispy Chicken Nugget (6 pcs)', 'fnb', 25000, null, 0, 0, 0, 0, 0],
      [5, 'CF-CHOC', 'Ice Chocolate Kids', 'fnb', 22000, null, 0, 0, 0, 0, 0],
      [5, 'CF-TEA', 'Es Teh Manis', 'fnb', 10000, null, 0, 0, 0, 0, 0],
      [5, 'CF-MINERAL', 'Air Mineral 600ml', 'fnb', 6000, null, 0, 0, 0, 0, 0],
      [5, 'CF-COFFEE', 'Kopi Susu Aren', 'fnb', 22000, null, 0, 0, 0, 0, 0]
    ];
    for (const item of items) {
      await conn.query(`
        INSERT INTO products (business_unit_id, sku, name, product_type, base_price, play_minutes, is_open_play, covers_children, covers_companions, max_reentry, tolerance_minutes, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
      `, item);
    }
  }

  const [ot] = await conn.query("SELECT id FROM products WHERE sku = 'OT-FEE'");
  if (ot.length === 0) {
    await conn.query(`
      INSERT INTO products (business_unit_id, sku, name, product_type, base_price, is_active, created_at, updated_at)
      VALUES (1, 'OT-FEE', 'Denda Overtime', 'overtime', 0, 1, NOW(), NOW())
    `);
  }

  // 5. Shift awal
  const [shifts] = await conn.query("SELECT count(*) as count FROM shifts WHERE status = 'open'");
  if (shifts[0].count === 0) {
    const [kasir] = await conn.query("SELECT id FROM users WHERE email = 'kasir@playtopia.id'");
    if (kasir.length > 0) {
      await conn.query(`
        INSERT INTO shifts (outlet_id, user_id, status, opened_at, opening_cash, expected_cash, counted_cash, created_at, updated_at)
        VALUES (1, ?, 'open', NOW(), 300000, 300000, 0, NOW(), NOW())
      `, [kasir[0].id]);
    }
  }

  // 6. Member & kartu RFID
  const [members] = await conn.query('SELECT count(*) as count FROM members');
  if (members[0].count === 0) {
    const [mRes] = await conn.query(`
      INSERT INTO members (member_code, name, phone, email, registered_outlet_id, balance, status, created_at, updated_at)
      VALUES ('MBR-001', 'Budi Santoso', '081234567890', 'budi@example.com', 1, 250000, 'active', NOW(), NOW())
    `);
    await conn.query(`
      INSERT INTO member_cards (member_id, card_uid, status, issued_at, created_at)
      VALUES (?, '3492817290', 'active', NOW(), NOW())
    `, [mRes.insertId]);
  }

  // 7. Membership Plans & Vouchers
  const [plans] = await conn.query('SELECT count(*) as count FROM membership_plans');
  if (plans[0].count === 0) {
    await conn.query(`
      INSERT INTO membership_plans (name, price, discount_percent, valid_days, is_active, created_at, updated_at)
      VALUES
      ('Playmiles Silver (3 Bulan)', 150000, 10, 90, 1, NOW(), NOW()),
      ('Playmiles Gold VIP (1 Tahun)', 450000, 15, 365, 1, NOW(), NOW())
    `);
  }

  const [vouchers] = await conn.query('SELECT count(*) as count FROM vouchers');
  if (vouchers[0].count === 0) {
    await conn.query(`
      INSERT INTO vouchers (code, name, discount_type, discount_value, min_purchase, max_discount, valid_from, valid_until, usage_limit, used_count, outlet_id, stackable_with_member, is_active, created_at, updated_at)
      VALUES
      ('CERIA10', 'Diskon Ceria 10%', 'percent', 10, 50000, 50000, NOW(), DATE_ADD(NOW(), INTERVAL 90 DAY), 100, 0, 1, 1, 1, NOW(), NOW()),
      ('HEMAT20K', 'Potongan Langsung Rp 20.000', 'fixed', 20000, 100000, 20000, NOW(), DATE_ADD(NOW(), INTERVAL 90 DAY), 50, 0, 1, 0, 1, NOW(), NOW())
    `);
  }
}

export async function seedMySQL() {
  const conn = await pool.getConnection();
  try {
    await runSeedQueries(conn);
    console.log(`✅ Database playtopia_id ready (${useSqliteFallback ? 'Local SQLite Mirror' : 'MySQL 100.113.174.74'}) - Admin, Owner, Kasir seeded!`);
  } finally {
    conn.release();
  }
}
