import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

// Kredensial bisa dioverride lewat environment variable (jangan commit password produksi).
export const pool = mysql.createPool({
  host: process.env.DB_HOST || '100.113.174.74',
  user: process.env.DB_USER || 'wandi',
  password: process.env.DB_PASSWORD || 'wandi123',
  database: process.env.DB_NAME || 'playtopia_id',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // DECIMAL dikembalikan sebagai number (bukan string "50000.00")
  decimalNumbers: true
});

export const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

// API key demo untuk gate turnstile (hardware mengirim header x-gate-key).
export const DEMO_GATE_KEY = process.env.DEMO_GATE_KEY || 'DEMO-GATE-KEY-01';

const DEMO_USERS = [
  { role_id: 3, name: 'Kasir Utama', email: 'kasir@playtopia.id', password: 'kasir123' },
  { role_id: 1, name: 'Owner Playtopia', email: 'owner@playtopia.id', password: 'owner123' }
];

export async function seedMySQL() {
  const conn = await pool.getConnection();
  try {
    // 1. Outlet
    const [outlets] = await conn.query('SELECT count(*) as count FROM outlets');
    if (outlets[0].count === 0) {
      await conn.query(`
        INSERT INTO outlets (id, code, name, address, city, phone, timezone, is_active, created_at, updated_at)
        VALUES (1, 'OUTLET-01', 'Playground & Cafe Mall', 'Mall Central Park Lt. 2', 'Jakarta Barat', '021-5551234', 'Asia/Jakarta', 1, NOW(), NOW())
      `);
    }

    // 2. Users (password di-hash bcrypt). User lama dengan hash placeholder ikut diperbaiki.
    for (const u of DEMO_USERS) {
      const [rows] = await conn.query('SELECT id, password_hash FROM users WHERE email = ?', [u.email]);
      if (rows.length === 0) {
        await conn.query(
          `INSERT INTO users (role_id, outlet_id, name, email, password_hash, is_active, created_at, updated_at)
           VALUES (?, 1, ?, ?, ?, 1, NOW(), NOW())`,
          [u.role_id, u.name, u.email, bcrypt.hashSync(u.password, 10)]
        );
      } else if (!String(rows[0].password_hash).startsWith('$2')) {
        await conn.query('UPDATE users SET password_hash = ? WHERE id = ?', [bcrypt.hashSync(u.password, 10), rows[0].id]);
      }
    }

    // 3. Gates (api_key_hash = sha256 dari API key)
    const gateHash = sha256(DEMO_GATE_KEY);
    const [gates] = await conn.query('SELECT count(*) as count FROM gates');
    if (gates[0].count === 0) {
      await conn.query(`
        INSERT INTO gates (id, outlet_id, code, name, direction, api_key_hash, is_active, created_at, updated_at)
        VALUES
        (1, 1, 'GATE-IN-01', 'Tripod Turnstile Masuk (IN)', 'IN', ?, 1, NOW(), NOW()),
        (2, 1, 'GATE-OUT-01', 'Tripod Turnstile Keluar (OUT)', 'OUT', ?, 1, NOW(), NOW())
      `, [gateHash, gateHash]);
    } else {
      // hash placeholder dari seed lama -> ganti dengan hash API key demo
      await conn.query('UPDATE gates SET api_key_hash = ? WHERE api_key_hash = ?', [gateHash, sha256('')]);
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

    // Produk khusus untuk mencatat pembayaran denda overtime (tidak tampil di katalog kasir)
    const [ot] = await conn.query("SELECT id FROM products WHERE sku = 'OT-FEE'");
    if (ot.length === 0) {
      await conn.query(`
        INSERT INTO products (business_unit_id, sku, name, product_type, base_price, is_active, created_at, updated_at)
        VALUES (1, 'OT-FEE', 'Denda Overtime', 'overtime', 0, 1, NOW(), NOW())
      `);
    }

    // 5. Shift awal untuk kasir demo
    const [shifts] = await conn.query("SELECT count(*) as count FROM shifts WHERE status = 'open'");
    if (shifts[0].count === 0) {
      const [kasir] = await conn.query("SELECT id FROM users WHERE email = 'kasir@playtopia.id'");
      await conn.query(`
        INSERT INTO shifts (outlet_id, user_id, status, opened_at, opening_cash, expected_cash, counted_cash, created_at, updated_at)
        VALUES (1, ?, 'open', NOW(), 300000, 300000, 0, NOW(), NOW())
      `, [kasir[0].id]);
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

    console.log('✅ MySQL Database playtopia_id ready!');
  } finally {
    conn.release();
  }
}
