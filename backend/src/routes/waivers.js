import express from 'express';
import crypto from 'node:crypto';
import { pool } from '../db_mysql.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function encodeGuestWithChildren(parentName, children) {
  const p = String(parentName || '').replace(/\|\|/g, '-').trim();
  const childPart = (children || [])
    .map(c => `${String(c.name || '').replace(/[:|,]/g, ' ').trim()}:${Math.max(1, Math.min(18, Number(c.age) || 5))}`)
    .filter(Boolean)
    .join(', ');
  const combined = childPart ? `${p} || ${childPart}` : p;
  return combined.slice(0, 120);
}

function parseChildren(row) {
  const rawGuest = String(row.guest_name || '').trim();
  let parentName = rawGuest;
  let children = [];

  if (rawGuest.includes('||')) {
    const [pPart, cPart] = rawGuest.split('||');
    parentName = String(pPart || '').trim() || rawGuest;
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
  } else if (row.children_json) {
    try {
      const parsed = JSON.parse(row.children_json);
      if (Array.isArray(parsed)) children = parsed;
    } catch {
      children = [];
    }
  }

  if (children.length === 0 && parentName) {
    children = [{ name: parentName, age: 5 }];
  }

  return {
    id: row.id,
    registration_code: row.registration_code,
    parent_name: parentName,
    guest_name: parentName,
    phone: row.phone,
    email: row.email || '',
    visit_date: row.visit_date,
    children_count: children.length || Number(row.children_count) || 1,
    children,
    status: row.status || 'registered',
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

/**
 * PUBLIC ENDPOINT: Lookup existing waiver by phone or code
 * GET /api/v1/waivers/public/lookup?q=...
 */
router.get('/public/lookup', async (req, res) => {
  try {
    const q = String(req.query.q || req.query.phone || '').trim();
    if (!q) {
      return res.status(400).json({ success: false, message: 'Masukkan nomor HP atau kode waiver.' });
    }

    const [rows] = await pool.query(`
      SELECT * FROM online_registrations
      WHERE phone = ? OR registration_code = ?
      ORDER BY id DESC LIMIT 1
    `, [q, q.toUpperCase()]);

    if (rows.length === 0) {
      return res.json({ success: true, data: null, message: 'Data waiver belum ditemukan.' });
    }

    res.json({ success: true, data: parseChildren(rows[0]) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUBLIC ENDPOINT: Submit or update permanent online waiver
 * POST /api/v1/waivers/public
 */
router.post('/public', async (req, res) => {
  try {
    const parentName = String(req.body?.parent_name || req.body?.guest_name || '').trim();
    const phone = String(req.body?.phone || '').replace(/[^\d+]/g, '').trim();
    const email = String(req.body?.email || '').trim();
    const agreed = Boolean(req.body?.agreed);
    const rawChildren = Array.isArray(req.body?.children) ? req.body.children : [];

    if (!parentName) {
      return res.status(400).json({ success: false, message: 'Nama Orang Tua / Wali wajib diisi.' });
    }
    if (!phone || phone.length < 8) {
      return res.status(400).json({ success: false, message: 'Nomor WhatsApp / HP wajib diisi dengan benar.' });
    }
    if (!agreed) {
      return res.status(400).json({ success: false, message: 'Anda wajib mencentang kotak persetujuan aturan bermain (Waiver).' });
    }

    const cleanChildren = rawChildren
      .map(c => ({
        name: String(c?.name || '').trim(),
        age: Math.max(1, Math.min(18, Number(c?.age) || 5))
      }))
      .filter(c => c.name.length > 0);

    if (cleanChildren.length === 0) {
      return res.status(400).json({ success: false, message: 'Minimal 1 nama anak wajib diisi.' });
    }

    const encodedGuestName = encodeGuestWithChildren(parentName, cleanChildren);

    // Check if phone is already registered (permanent 1-time registration)
    const [existing] = await pool.query(
      'SELECT * FROM online_registrations WHERE phone = ? ORDER BY id DESC LIMIT 1',
      [phone]
    );

    if (existing.length > 0) {
      const rec = existing[0];
      await pool.query(`
        UPDATE online_registrations
        SET guest_name = ?, email = ?, children_count = ?, visit_date = CURDATE(), updated_at = NOW()
        WHERE id = ?
      `, [encodedGuestName, email || rec.email || null, cleanChildren.length, rec.id]);

      const [updatedRows] = await pool.query('SELECT * FROM online_registrations WHERE id = ?', [rec.id]);
      return res.json({
        success: true,
        message: 'Data Waiver berhasil diperbarui! Cukup tunjukkan QR atau sebutkan Nomor HP ini di kasir.',
        data: parseChildren(updatedRows[0])
      });
    }

    const codeSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    const regCode = `WV-${new Date().toISOString().slice(2, 4)}${new Date().toISOString().slice(5, 7)}-${codeSuffix}`;

    const [ins] = await pool.query(`
      INSERT INTO online_registrations (
        registration_code, outlet_id, guest_name, phone, email, visit_date,
        children_count, companions_count, status, created_at, updated_at
      )
      VALUES (?, 1, ?, ?, ?, CURDATE(), ?, 1, 'registered', NOW(), NOW())
    `, [regCode, encodedGuestName, phone, email || null, cleanChildren.length]);

    const [createdRows] = await pool.query('SELECT * FROM online_registrations WHERE id = ?', [ins.insertId]);
    res.status(201).json({
      success: true,
      message: 'Registrasi Waiver berhasil disimpan! Data Anda berlaku permanen untuk kunjungan berikutnya.',
      data: parseChildren(createdRows[0])
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Protected routes for Cashier POS & Admin
router.use(requireAuth);

/**
 * GET /api/v1/waivers
 * List all permanent online waivers
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM online_registrations ORDER BY updated_at DESC, id DESC LIMIT 200');
    res.json({
      success: true,
      data: rows.map(parseChildren)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/v1/waivers/search?q=...
 * Search waiver by QR registration_code, phone number, parent name, or child name
 */
router.get('/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      const [recent] = await pool.query('SELECT * FROM online_registrations ORDER BY updated_at DESC, id DESC LIMIT 10');
      return res.json({ success: true, data: recent.map(parseChildren) });
    }

    const likeQ = `%${q}%`;
    const [rows] = await pool.query(`
      SELECT * FROM online_registrations
      WHERE registration_code = ?
         OR phone = ?
         OR registration_code LIKE ?
         OR phone LIKE ?
         OR guest_name LIKE ?
      ORDER BY (registration_code = ? OR phone = ?) DESC, updated_at DESC
      LIMIT 20
    `, [q.toUpperCase(), q, likeQ, likeQ, likeQ, q.toUpperCase(), q]);

    // Cari juga dari tabel members (jika pelanggan sudah terdaftar di Direktori Member)
    const [memberRows] = await pool.query(`
      SELECT m.*, mc.card_uid,
        COALESCE(m.expires_on, DATE(DATE_ADD(m.created_at, INTERVAL 3 MONTH))) AS expires_on,
        20 as playground_discount_pct,
        10 as cafe_discount_pct,
        20 as discount_pct,
        'MEMBER SWIPE' as tier
      FROM members m
      LEFT JOIN member_cards mc ON mc.member_id = m.id AND mc.status = 'active'
      WHERE m.status = 'active'
        AND (
          m.member_code = ?
          OR m.phone = ?
          OR mc.card_uid = ?
          OR m.name LIKE ?
          OR m.phone LIKE ?
          OR m.member_code LIKE ?
        )
      ORDER BY m.id DESC
      LIMIT 10
    `, [q.toUpperCase(), q, q, likeQ, likeQ, likeQ]);

    const results = rows.map(parseChildren);
    const existingPhones = new Set(results.map(r => String(r.phone || '').trim()));

    // Lampirkan data member jika nomor HP cocok, atau tambahkan sebagai entri baru jika belum ada di online_registrations
    for (const m of memberRows) {
      const mPhone = String(m.phone || '').trim();
      let matchedWaiver = results.find(r => String(r.phone || '').trim() === mPhone);
      if (!matchedWaiver && mPhone) {
        const [wByPhone] = await pool.query(
          'SELECT * FROM online_registrations WHERE phone = ? ORDER BY id DESC LIMIT 1',
          [mPhone]
        );
        if (wByPhone.length > 0) {
          matchedWaiver = parseChildren(wByPhone[0]);
          results.push(matchedWaiver);
          existingPhones.add(mPhone);
        }
      }

      if (matchedWaiver) {
        matchedWaiver.member_data = m;
      } else if (!existingPhones.has(mPhone)) {
        existingPhones.add(mPhone);
        results.push({
          id: `mbr-${m.id}`,
          member_id: m.id,
          registration_code: m.member_code,
          parent_name: m.name,
          guest_name: m.name,
          phone: m.phone,
          email: m.email || '',
          children_count: 0,
          children: [],
          status: 'member',
          member_data: m
        });
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/v1/waivers/:id/add-child
 * Add a child to an existing parent's waiver directly from Cashier POS
 */
router.post('/:id/add-child', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const childName = String(req.body?.name || '').trim();
    const childAge = Math.max(1, Math.min(18, Number(req.body?.age) || 5));

    if (!childName) {
      return res.status(400).json({ success: false, message: 'Nama anak wajib diisi.' });
    }

    const [rows] = await pool.query('SELECT * FROM online_registrations WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data waiver tidak ditemukan.' });
    }

    const parsed = parseChildren(rows[0]);
    const updatedChildren = [...parsed.children, { name: childName, age: childAge }];
    const encodedGuestName = encodeGuestWithChildren(parsed.parent_name, updatedChildren);

    await pool.query(`
      UPDATE online_registrations
      SET guest_name = ?, children_count = ?, updated_at = NOW()
      WHERE id = ?
    `, [encodedGuestName, updatedChildren.length, id]);

    const [updatedRows] = await pool.query('SELECT * FROM online_registrations WHERE id = ?', [id]);
    res.json({
      success: true,
      message: `Anak "${childName}" berhasil ditambahkan ke data waiver ${parsed.parent_name}.`,
      data: parseChildren(updatedRows[0])
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/v1/waivers/:id
 * Update parent info and children list (name + custom age) from Management page
 */
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [rows] = await pool.query('SELECT * FROM online_registrations WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Data waiver tidak ditemukan.' });
    }

    const parsed = parseChildren(rows[0]);
    const parentName = String(req.body?.parent_name || parsed.parent_name).trim();
    const phone = String(req.body?.phone || parsed.phone).replace(/[^\d+]/g, '').trim();
    const rawChildren = Array.isArray(req.body?.children) ? req.body.children : parsed.children;

    const cleanChildren = rawChildren
      .map(c => ({
        name: String(c?.name || '').trim(),
        age: Math.max(1, Math.min(18, Number(c?.age) || 5))
      }))
      .filter(c => c.name.length > 0);

    if (cleanChildren.length === 0) {
      return res.status(400).json({ success: false, message: 'Minimal 1 data anak wajib diisi.' });
    }

    const encodedGuestName = encodeGuestWithChildren(parentName, cleanChildren);

    await pool.query(`
      UPDATE online_registrations
      SET guest_name = ?, phone = ?, children_count = ?, updated_at = NOW()
      WHERE id = ?
    `, [encodedGuestName, phone, cleanChildren.length, id]);

    const [updatedRows] = await pool.query('SELECT * FROM online_registrations WHERE id = ?', [id]);
    res.json({
      success: true,
      message: `Data keluarga ${parentName} berhasil diperbarui.`,
      data: parseChildren(updatedRows[0])
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

