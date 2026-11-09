import express from 'express';
import {
  sendTestEmail,
  DEFAULT_REPORT_EMAIL,
  getTargetEmail,
  verifyAndSaveSmtpConfig,
  getLatestEmailLogHtml
} from '../services/mailer.js';
import { triggerDailyEmailReport, getDailyStats, getLastDailyReportSent } from '../services/scheduler.js';

const router = express.Router();

/**
 * GET /api/v1/reports/email-config
 * Mengambil status dan konfigurasi laporan email otomatis
 * Detail alamat email & 16-digit App Password hanya ditampilkan untuk Admin
 */
router.get('/email-config', async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'Admin' || Number(req.user?.role_id) === 2;
    const isSmtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    const fullTargetEmail = getTargetEmail();
    const fullSmtpUser = process.env.SMTP_USER || fullTargetEmail;

    res.json({
      success: true,
      data: {
        is_admin: isAdmin,
        target_email: isAdmin ? fullTargetEmail : 'Email Admin Terdaftar (Disembunyikan)',
        smtp_user: isAdmin ? fullSmtpUser : '',
        smtp_pass: isAdmin ? (process.env.SMTP_PASS || '') : '',
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
 * POST /api/v1/reports/smtp-config
 * Menyimpan dan memverifikasi kredensial SMTP Gmail langsung dari UI (Khusus Admin)
 */
router.post('/smtp-config', async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'Admin' || Number(req.user?.role_id) === 2;
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Hanya Admin yang diizinkan melihat atau mengubah pengaturan email dan App Password.'
      });
    }

    const saved = await verifyAndSaveSmtpConfig({
      smtp_user: req.body?.smtp_user,
      smtp_pass: req.body?.smtp_pass,
      target_email: req.body?.target_email
    });

    res.json({
      success: true,
      message: `Konfigurasi email (${saved.target_email}) & App Password berhasil diverifikasi dan disimpan!`,
      data: {
        ...saved,
        smtp_pass: process.env.SMTP_PASS || ''
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: `Gagal terhubung ke SMTP Gmail: ${error.message}. Pastikan menggunakan 16 karakter App Password Google yang sesuai dengan emailnya.`
    });
  }
});

/**
 * POST /api/v1/reports/test-email
 * Mengirim email uji coba / verifikasi
 */
router.post('/test-email', async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'Admin' || Number(req.user?.role_id) === 2;
    const rawEmail = String(req.body?.email || '').trim();
    const targetEmail = (isAdmin && rawEmail && /^\S+@\S+\.\S+$/.test(rawEmail))
      ? rawEmail
      : getTargetEmail();

    const result = await sendTestEmail(targetEmail);
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: `Gagal mengirim email: ${result.error || 'Kesalahan SMTP'}`,
        data: result
      });
    }

    const displayRecipient = isAdmin ? targetEmail : 'Email Admin Terdaftar';
    const msg = result.mode === 'live_smtp'
      ? `Email resmi berhasil dikirim langsung ke inbox ${displayRecipient}!`
      : `Mode Simulasi: Draft email untuk ${displayRecipient} berhasil dibuat.`;

    res.json({
      success: true,
      message: msg,
      data: {
        ...result,
        recipient: displayRecipient
      }
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
    const isAdmin = req.user?.role === 'Admin' || Number(req.user?.role_id) === 2;
    const rawEmail = String(req.body?.email || '').trim();
    const targetEmail = (isAdmin && rawEmail && /^\S+@\S+\.\S+$/.test(rawEmail))
      ? rawEmail
      : getTargetEmail();

    const result = await triggerDailyEmailReport(targetEmail);
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: `Gagal mengirim laporan harian: ${result.error || 'Kesalahan SMTP'}`,
        data: result
      });
    }

    const displayRecipient = isAdmin ? targetEmail : 'Email Admin Terdaftar';
    const msg = result.mode === 'live_smtp'
      ? `Laporan rekap harian berhasil dikirim langsung ke inbox ${displayRecipient}!`
      : `Mode Simulasi: Draft laporan harian untuk ${displayRecipient} berhasil dibuat.`;

    res.json({
      success: true,
      message: msg,
      data: {
        ...result,
        recipient: displayRecipient
      }
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

/**
 * GET /api/v1/reports/preview-latest
 * Mengambil HTML email terakhir untuk ditampilkan di modal pratinjau
 */
router.get('/preview-latest', async (req, res) => {
  try {
    const html = getLatestEmailLogHtml();
    res.json({ success: true, data: { html } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
