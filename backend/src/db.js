import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'playground_pos.sqlite');
const db = new DatabaseSync(dbPath);

// Enable WAL mode & foreign keys
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('PLAYGROUND', 'CAFE')),
      price REAL NOT NULL,
      duration_minutes INTEGER DEFAULT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_uid TEXT UNIQUE,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      balance REAL DEFAULT 0,
      tier TEXT DEFAULT 'REGULAR',
      discount_pct REAL DEFAULT 10,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cashier_name TEXT NOT NULL,
      open_time TEXT DEFAULT (datetime('now', 'localtime')),
      close_time TEXT,
      opening_cash REAL NOT NULL DEFAULT 0,
      closing_cash_actual REAL,
      system_cash REAL DEFAULT 0,
      system_non_cash REAL DEFAULT 0,
      notes TEXT,
      status TEXT DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'CLOSED'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      shift_id INTEGER,
      customer_name TEXT DEFAULT 'Umum',
      customer_phone TEXT,
      subtotal REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('CASH', 'QRIS', 'DEBIT', 'MEMBER_BALANCE')),
      payment_status TEXT DEFAULT 'PAID' CHECK(payment_status IN ('PENDING', 'PAID', 'CANCELLED')),
      paid_at TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY(shift_id) REFERENCES shifts(id)
    );

    CREATE TABLE IF NOT EXISTS transaction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      qty INTEGER NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      ticket_code TEXT UNIQUE NOT NULL,
      qr_token TEXT UNIQUE NOT NULL,
      rfid_uid TEXT,
      visitor_name TEXT NOT NULL,
      package_name TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      start_time TEXT,
      expiry_time TEXT,
      grace_period_minutes INTEGER DEFAULT 10,
      max_reentry INTEGER DEFAULT 2,
      reentry_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'COMPLETED', 'OVERTIME', 'EXPIRED')),
      overtime_minutes INTEGER DEFAULT 0,
      overtime_fee REAL DEFAULT 0,
      overtime_paid INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY(transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS access_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER,
      gate_id TEXT NOT NULL,
      direction TEXT NOT NULL CHECK(direction IN ('IN', 'OUT')),
      credential_type TEXT NOT NULL CHECK(credential_type IN ('QR', 'RFID')),
      credential_value TEXT NOT NULL,
      is_allowed INTEGER NOT NULL,
      message TEXT,
      scanned_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY(ticket_id) REFERENCES tickets(id)
    );

    CREATE TABLE IF NOT EXISTS notification_outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'DELIVERED',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Seed default products if empty
  const countStmt = db.prepare('SELECT count(*) as count FROM products');
  const result = countStmt.get();
  if (result.count === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO products (code, name, category, price, duration_minutes, description) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Playground packages (Fitur #3, #10)
    insertProduct.run('PG-1H', 'Paket Bermain 1 Jam', 'PLAYGROUND', 50000, 60, 'Durasi 1 Jam + Toleransi 10 Menit, Maksimal 2x Keluar');
    insertProduct.run('PG-2H', 'Paket Bermain 2 Jam', 'PLAYGROUND', 80000, 120, 'Durasi 2 Jam + Toleransi 10 Menit, Maksimal 2x Keluar');
    insertProduct.run('PG-MAX', 'Paket Bermain Sepuasnya (All-Day)', 'PLAYGROUND', 120000, 0, 'Bermain seharian sepuasnya tanpa batas waktu');
    insertProduct.run('PG-PARTY', 'Paket Group / Ulang Tahun (10 Anak)', 'PLAYGROUND', 1200000, 180, 'Termasuk area pesta 3 jam, 10 tiket bermain, dan welcome snack');

    // Cafe items (Fitur #1)
    insertProduct.run('CF-FRIES', 'Kentang Goreng (French Fries)', 'CAFE', 25000, null, 'Camilan renyah dengan saus keju & tomat');
    insertProduct.run('CF-NUGGET', 'Crispy Chicken Nugget (6 pcs)', 'CAFE', 25000, null, 'Nugget ayam renyah favorit anak');
    insertProduct.run('CF-CHOC', 'Ice Chocolate Kids', 'CAFE', 22000, null, 'Susu cokelat dingin segar');
    insertProduct.run('CF-TEA', 'Es Teh Manis', 'CAFE', 10000, null, 'Teh melati manis dingin');
    insertProduct.run('CF-MINERAL', 'Air Mineral 600ml', 'CAFE', 6000, null, 'Air mineral kemasan');
    insertProduct.run('CF-COFFEE', 'Kopi Susu Aren (Untuk Orang Tua)', 'CAFE', 22000, null, 'Espresso, fresh milk, dan gula aren');

    // Seed sample member (Fitur #5)
    const insertMember = db.prepare(`
      INSERT INTO members (card_uid, name, phone, balance, tier, discount_pct)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertMember.run('3492817290', 'Budi Santoso (Member Gold)', '081234567890', 250000, 'GOLD', 10);
    insertMember.run('A1B2C3D4E5', 'Siti Rahma (Member Silver)', '089876543210', 100000, 'SILVER', 5);

    // Seed initial active shift (Fitur #13)
    const insertShift = db.prepare(`
      INSERT INTO shifts (cashier_name, opening_cash, status)
      VALUES (?, ?, 'OPEN')
    `);
    insertShift.run('Kasir Utama', 300000);
  }
}

export default db;

