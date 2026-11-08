import express from 'express';
import { pool } from '../db_mysql.js';

const router = express.Router();

// GET all products from MySQL playtopia_id
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = `
      SELECT 
        p.id,
        p.sku as code,
        p.name,
        bu.code as category,
        p.base_price as price,
        p.play_minutes as duration_minutes,
        p.is_open_play,
        p.max_reentry,
        p.tolerance_minutes,
        CONCAT(
          CASE 
            WHEN p.is_open_play = 1 THEN 'Bermain seharian sepuasnya tanpa batas waktu'
            WHEN p.play_minutes IS NOT NULL THEN CONCAT('Durasi ', p.play_minutes, ' Menit + Toleransi 10 Menit, Maksimal 2x Keluar')
            ELSE 'Menu cafe & snack lezat'
          END
        ) as description,
        p.is_active
      FROM products p
      JOIN business_units bu ON p.business_unit_id = bu.id
      WHERE p.is_active = 1 AND p.sku <> 'OT-FEE'
    `;
    const params = [];

    if (category && category !== 'ALL') {
      query += ' AND bu.code = ?';
      params.push(category);
    }
    query += ' ORDER BY bu.id ASC, p.base_price ASC';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
