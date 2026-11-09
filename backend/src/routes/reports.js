import express from 'express';
import { sendTestEmail, DEFAULT_REPORT_EMAIL } from '../services/mailer.js';
import { triggerDailyEmailReport, getDailyStats, getLastDailyReportSent } from '../services/scheduler.js';

const router = express.Router();

/**
 * GET /api/v1/reports/email-config
 * Mengambil status dan konfigurasi laporan email otomatis
 */
router.get('/email-config', async (req, res) => {
  try {
    const isSmtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    res.json({
      success: true,
      data: {
        target_email: process.env.REPORT_TARGET_EMAIL || DEFAULT_REPORT_EMAIL,
        schedule_time: '22:00 WIB (Harian Otomatis)',
        on_shift_close: true,
        smtp_configured: isSmtpConfigured,
        smtp_host: process.env.SMTP_HOST || 'smtp.gmail.com',
        last_sent_at: getLastDailyReportSent()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/v1/reports/test-email
 * Mengirim email uji coba / verifikasi
 */
router.post('/test-email', async (req, res) => {
  try {
    const targetEmail = String(req.body?.email || '').trim() || DEFAULT_REPORT_EMAIL;
    if (!/^\S+@\S+\.\S+$/.test(targetEmail)) {
      return res.status(400).json({ success: false, message: 'Format alamat email tidak valid.' });
    }

    const result = await sendTestEmail(targetEmail);
    res.json({
      success: true,
      message: `Email uji coba berhasil dikirim ke ${targetEmail}`,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/v1/reports/send-daily
 * Memicu pengiriman laporan harian otomatis ke email
 */
router.post('/send-daily', async (req, res) => {
  try {
    const targetEmail = String(req.body?.email || '').trim() || DEFAULT_REPORT_EMAIL;
    if (!/^\S+@\S+\.\S+$/.test(targetEmail)) {
      return res.status(400).json({ success: false, message: 'Format alamat email tidak valid.' });
    }

    const result = await triggerDailyEmailReport(targetEmail);
    res.json({
      success: true,
      message: `Laporan rekap harian berhasil dikirim ke ${targetEmail}`,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/v1/reports/daily-stats
 * Pratinjau data rekap harian sebelum dikirim
 */
router.get('/daily-stats', async (req, res) => {
  try {
    const data = await getDailyStats(new Date());
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
