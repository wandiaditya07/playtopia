import cron from 'node-cron';
import { pool } from '../db_mysql.js';
import { sendDailySummaryEmail, getTargetEmail } from './mailer.js';

let lastDailyReportSent = null;

export async function getDailyStats(targetDate = new Date()) {
  const d = new Date(targetDate);
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
  const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

  try {
    const [sales] = await pool.query(`
      SELECT
        COUNT(DISTINCT o.id) AS total_transactions,
        COALESCE(SUM(o.total), 0) AS total_revenue,
        COALESCE(SUM(CASE WHEN p.method = 'cash' THEN p.amount ELSE 0 END), 0) AS cash_total,
        COALESCE(SUM(CASE WHEN p.method = 'qris' THEN p.amount ELSE 0 END), 0) AS qris_total,
        COALESCE(SUM(CASE WHEN p.method = 'card_edc' THEN p.amount ELSE 0 END), 0) AS debit_total,
        COALESCE(SUM(CASE WHEN p.method = 'member_balance' THEN p.amount ELSE 0 END), 0) AS member_balance_total
      FROM orders o
      LEFT JOIN payments p ON p.order_id = o.id AND p.status = 'paid'
      WHERE o.status = 'paid' AND o.created_at >= ? AND o.created_at <= ?
    `, [startOfDay, endOfDay]);

    const [breakdown] = await pool.query(`
      SELECT bu.code AS category, COALESCE(SUM(oi.line_total), 0) AS revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN business_units bu ON p.business_unit_id = bu.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'paid' AND o.created_at >= ? AND o.created_at <= ?
      GROUP BY bu.code
    `, [startOfDay, endOfDay]);

    const [visitors] = await pool.query(`
      SELECT COUNT(*) AS total_visitors
      FROM tickets
      WHERE created_at >= ? AND created_at <= ?
    `, [startOfDay, endOfDay]);

    const s = sales[0] || {};
    return {
      stats: {
        total_transactions: s.total_transactions || 0,
        total_revenue: s.total_revenue || 0,
        cash_total: s.cash_total || 0,
        qris_total: s.qris_total || 0,
        debit_total: s.debit_total || 0,
        member_balance_total: s.member_balance_total || 0,
        playground_sales: breakdown.find(b => b.category === 'PLAYGROUND')?.revenue || 0,
        cafe_sales: breakdown.find(b => b.category === 'CAFE')?.revenue || 0
      },
      visitorsCount: visitors[0]?.total_visitors || 0
    };
  } catch (error) {
    console.error('Error calculating daily stats:', error.message);
    return {
      stats: {
        total_transactions: 0,
        total_revenue: 0,
        cash_total: 0,
        qris_total: 0,
        debit_total: 0,
        member_balance_total: 0,
        playground_sales: 0,
        cafe_sales: 0
      },
      visitorsCount: 0
    };
  }
}

export async function triggerDailyEmailReport(targetEmail) {
  const recipient = getTargetEmail(targetEmail);
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { dateStyle: 'full' });
  const { stats, visitorsCount } = await getDailyStats(now);

  console.log(`[SCHEDULER] Mengirim Laporan Harian Otomatis ke: ${recipient}`);
  const result = await sendDailySummaryEmail({ dateStr, stats, visitorsCount }, recipient);
  if (result.success) {
    lastDailyReportSent = new Date().toISOString();
  }
  return result;
}

export function getLastDailyReportSent() {
  return lastDailyReportSent;
}

/**
 * Inisialisasi otomatis cron scheduler
 * Berjalan setiap hari pukul 22:00 WIB (malam saat playground tutup)
 */
export function initReportScheduler() {
  // Setiap hari jam 22:00: '0 22 * * *'
  cron.schedule('0 22 * * *', async () => {
    console.log('[SCHEDULER] Menjalankan jadwal harian pengiriman email laporan...');
    await triggerDailyEmailReport();
  });

  console.log('⏰ Scheduler Laporan Otomatis via Email AKTIF: Setiap hari pk 22:00 WIB -> ' + getTargetEmail());
}

