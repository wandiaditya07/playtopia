import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default destination email
export const DEFAULT_REPORT_EMAIL = process.env.REPORT_TARGET_EMAIL || 'testgmailjs@gmail.com';

// Directory to store email logs/previews if SMTP is not yet configured
const EMAIL_LOGS_DIR = path.resolve(__dirname, '../../logs/sent-emails');
if (!fs.existsSync(EMAIL_LOGS_DIR)) {
  fs.mkdirSync(EMAIL_LOGS_DIR, { recursive: true });
}

function getTransporter() {
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  if (user && pass) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
      auth: { user, pass }
    });
  }

  // Fallback simulator transporter when SMTP is not yet configured
  return null;
}

export async function sendEmail({ to, subject, html, text }) {
  const recipient = to || DEFAULT_REPORT_EMAIL;
  const from = process.env.SMTP_FROM || '"Playtopia POS Auto-Report" <reports@playtopia.id>';
  const transporter = getTransporter();

  const timestamp = new Date().toISOString();

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from,
        to: recipient,
        subject,
        text,
        html
      });
      console.log(`[EMAIL LIVE] Laporan berhasil dikirim ke: ${recipient} (Message ID: ${info.messageId})`);
      return {
        success: true,
        mode: 'live_smtp',
        recipient,
        subject,
        messageId: info.messageId,
        sentAt: timestamp
      };
    } catch (err) {
      console.error(`[EMAIL ERROR] Gagal mengirim email ke ${recipient}:`, err.message);
      // Fallback to logged simulation if SMTP fails
      saveEmailLog(recipient, subject, html, text, err.message);
      return {
        success: false,
        mode: 'failed_smtp',
        recipient,
        error: err.message,
        sentAt: timestamp
      };
    }
  }

  // Simulated delivery mode (SMTP not yet supplied in env)
  saveEmailLog(recipient, subject, html, text, 'Simulated mode: SMTP_USER/SMTP_PASS not provided');
  console.log(`[EMAIL SIMULATED] Laporan otomatis disimulasikan terkirim ke: ${recipient}`);
  return {
    success: true,
    mode: 'simulated',
    recipient,
    subject,
    note: 'SMTP belum dikonfigurasi di backend/.env. Email disimpan di logs/sent-emails.',
    sentAt: timestamp
  };
}

function saveEmailLog(recipient, subject, html, text, note) {
  try {
    const filename = `email_${Date.now()}_${recipient.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
    const filepath = path.join(EMAIL_LOGS_DIR, filename);
    const logContent = `<!-- To: ${recipient} | Subject: ${subject} | Note: ${note} -->\n${html}`;
    fs.writeFileSync(filepath, logContent, 'utf8');
  } catch (err) {
    console.error('Failed to save email log:', err.message);
  }
}

// Rupiah formatter helper
const rupiah = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

/**
 * Mengirim email laporan closing shift kasir
 */
export async function sendShiftClosingEmail({ shift, stats, expected, counted, variance, notes, user }, targetEmail = DEFAULT_REPORT_EMAIL) {
  const recipient = targetEmail || DEFAULT_REPORT_EMAIL;
  const shiftId = shift?.id || 'N/A';
  const cashierName = user?.name || shift?.cashier_name || 'Kasir';
  const openTime = shift?.opened_at ? new Date(shift.opened_at).toLocaleString('id-ID') : '-';
  const closeTime = new Date().toLocaleString('id-ID');

  const varianceStatus = variance === 0 ? 'PAS (SESUAI)' : variance > 0 ? `LEBIH (${rupiah(variance)})` : `KURANG (${rupiah(variance)})`;
  const varianceColor = variance === 0 ? '#10b981' : variance > 0 ? '#0284c7' : '#ef4444';

  const subject = `[Playtopia POS] Laporan Closing Shift #${shiftId} - ${closeTime}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #002c3e 0%, #00729c 100%); color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; letter-spacing: 1px; font-weight: 800; }
    .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: rgba(255,255,255,0.2); margin-top: 8px; }
    .content { padding: 24px; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px; font-size: 13px; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .meta-row:last-child { margin-bottom: 0; }
    .grid-stats { display: flex; gap: 12px; margin-bottom: 20px; }
    .stat-card { flex: 1; background: #f8fafc; border-left: 4px solid #00729c; padding: 12px; border-radius: 6px; }
    .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .stat-val { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 4px; }
    .section-title { font-size: 14px; font-weight: 700; color: #002c3e; margin: 20px 0 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; }
    th { text-align: left; padding: 8px; background: #f8fafc; color: #475569; font-size: 12px; }
    td { padding: 8px; border-bottom: 1px solid #f1f5f9; }
    .total-row td { font-weight: 800; font-size: 14px; border-top: 2px solid #e2e8f0; border-bottom: none; }
    .variance-box { background: #fafafa; border: 1.5px dashed ${varianceColor}; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 20px; }
    .variance-title { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .variance-val { font-size: 18px; font-weight: 900; color: ${varianceColor}; margin-top: 4px; }
    .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PLAYTOPIA INDONESIA</h1>
      <p>Playground &amp; Cafe Integrated POS System</p>
      <div class="badge">Laporan Closing Shift Kasir</div>
    </div>
    
    <div class="content">
      <div class="meta-box">
        <div class="meta-row"><span><strong>Shift:</strong> #${shiftId}</span> <span><strong>Kasir:</strong> ${cashierName}</span></div>
        <div class="meta-row"><span><strong>Waktu Buka:</strong> ${openTime}</span></div>
        <div class="meta-row"><span><strong>Waktu Tutup:</strong> ${closeTime}</span></div>
      </div>

      <div class="grid-stats">
        <div class="stat-card">
          <div class="stat-label">Total Omset</div>
          <div class="stat-val" style="color: #00729c;">${rupiah(stats?.total_revenue)}</div>
        </div>
        <div class="stat-card" style="border-left-color: #5cd2ff;">
          <div class="stat-label">Playground</div>
          <div class="stat-val">${rupiah(stats?.playground_sales)}</div>
        </div>
        <div class="stat-card" style="border-left-color: #ff5cbc;">
          <div class="stat-label">Cafe &amp; F&amp;B</div>
          <div class="stat-val">${rupiah(stats?.cafe_sales)}</div>
        </div>
      </div>

      <div class="section-title">Rekap Metode Pembayaran</div>
      <table>
        <thead>
          <tr><th>Metode</th><th style="text-align: right;">Jumlah</th></tr>
        </thead>
        <tbody>
          <tr><td>Tunai (Cash)</td><td style="text-align: right;">${rupiah(stats?.cash_total)}</td></tr>
          <tr><td>QRIS Sandbox / Static</td><td style="text-align: right;">${rupiah(stats?.qris_total)}</td></tr>
          <tr><td>Kartu EDC / Debit</td><td style="text-align: right;">${rupiah(stats?.debit_total)}</td></tr>
          <tr><td>Saldo Member (RFID)</td><td style="text-align: right;">${rupiah(stats?.member_balance_total)}</td></tr>
          <tr class="total-row"><td>TOTAL TRANSAKSI</td><td style="text-align: right;">${rupiah(stats?.total_revenue)} (${stats?.total_transactions || 0} trx)</td></tr>
        </tbody>
      </table>

      <div class="section-title">Rekonsiliasi Kas Laci (Drawer)</div>
      <table>
        <tbody>
          <tr><td>Modal Awal Laci</td><td style="text-align: right;">${rupiah(shift?.opening_cash)}</td></tr>
          <tr><td>Penjualan Tunai Masuk</td><td style="text-align: right;">+ ${rupiah(stats?.cash_total)}</td></tr>
          <tr><td><strong>Ekspektasi Kas Laci</strong></td><td style="text-align: right;"><strong>${rupiah(expected)}</strong></td></tr>
          <tr><td><strong>Kas Fisik Dihitung Kasir</strong></td><td style="text-align: right;"><strong>${rupiah(counted)}</strong></td></tr>
        </tbody>
      </table>

      <div class="variance-box">
        <div class="variance-title">Status Rekonsiliasi Kas Laci</div>
        <div class="variance-val">${varianceStatus}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Catatan: ${notes || 'Tidak ada catatan'}</div>
      </div>
    </div>

    <div class="footer">
      Laporan dikirim otomatis oleh Playtopia POS Automation ke <strong>${recipient}</strong>.<br>
      Senayan Park · Lantai 2 · Jakarta Pusat
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
Laporan Closing Shift #${shiftId}
Waktu Tutup: ${closeTime}
Petugas: ${cashierName}
---------------------------------------------
Total Omset   : ${rupiah(stats?.total_revenue)} (${stats?.total_transactions} transaksi)
- Playground  : ${rupiah(stats?.playground_sales)}
- Cafe & F&B  : ${rupiah(stats?.cafe_sales)}

Metode Pembayaran:
- Tunai       : ${rupiah(stats?.cash_total)}
- QRIS        : ${rupiah(stats?.qris_total)}
- EDC         : ${rupiah(stats?.debit_total)}
- Member      : ${rupiah(stats?.member_balance_total)}

Rekonsiliasi Kas Laci:
- Modal Awal  : ${rupiah(shift?.opening_cash)}
- Ekspektasi  : ${rupiah(expected)}
- Kas Fisik   : ${rupiah(counted)}
- Selisih     : ${varianceStatus}
- Catatan     : ${notes || '-'}
---------------------------------------------
Playtopia POS System
  `.trim();

  return await sendEmail({ to: recipient, subject, html, text });
}

/**
 * Mengirim email laporan harian otomatis (Daily Sales Summary)
 */
export async function sendDailySummaryEmail({ dateStr, stats, shiftsCount, visitorsCount, topProducts }, targetEmail = DEFAULT_REPORT_EMAIL) {
  const recipient = targetEmail || DEFAULT_REPORT_EMAIL;
  const dateFormatted = dateStr || new Date().toLocaleDateString('id-ID', { dateStyle: 'full' });
  const subject = `[Playtopia POS] Rekap Harian Otomatis - ${dateFormatted}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #002c3e 0%, #00729c 100%); color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 1px; }
    .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 24px; }
    .banner-date { background: #e0f2fe; color: #0369a1; padding: 10px 16px; border-radius: 8px; font-weight: 700; font-size: 13px; margin-bottom: 20px; text-align: center; }
    .kpi-row { display: flex; gap: 12px; margin-bottom: 20px; }
    .kpi-card { flex: 1; background: #f8fafc; border-top: 3px solid #00729c; border-radius: 8px; padding: 14px; text-align: center; }
    .kpi-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; }
    .kpi-val { font-size: 18px; font-weight: 800; color: #002c3e; margin-top: 4px; }
    .section-title { font-size: 14px; font-weight: 700; color: #002c3e; margin: 20px 0 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; }
    th { text-align: left; padding: 8px; background: #f8fafc; color: #475569; font-size: 12px; }
    td { padding: 8px; border-bottom: 1px solid #f1f5f9; }
    .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PLAYTOPIA INDONESIA</h1>
      <p>Laporan Penjualan &amp; Operasional Harian Otomatis</p>
    </div>
    <div class="content">
      <div class="banner-date">📅 ${dateFormatted}</div>

      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-label">Total Omset</div>
          <div class="kpi-val" style="color: #00729c;">${rupiah(stats?.total_revenue)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total Transaksi</div>
          <div class="kpi-val">${stats?.total_transactions || 0} Trx</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Pengunjung</div>
          <div class="kpi-val">${visitorsCount || 0} Orang</div>
        </div>
      </div>

      <div class="section-title">Omset per Unit Bisnis</div>
      <table>
        <thead>
          <tr><th>Unit Bisnis</th><th style="text-align: right;">Total Omset</th></tr>
        </thead>
        <tbody>
          <tr><td>Playground Access &amp; Tiket</td><td style="text-align: right;">${rupiah(stats?.playground_sales)}</td></tr>
          <tr><td>Cafe, Snack &amp; Minuman</td><td style="text-align: right;">${rupiah(stats?.cafe_sales)}</td></tr>
        </tbody>
      </table>

      <div class="section-title">Rekap Pembayaran Harian</div>
      <table>
        <tbody>
          <tr><td>Tunai</td><td style="text-align: right;">${rupiah(stats?.cash_total)}</td></tr>
          <tr><td>QRIS</td><td style="text-align: right;">${rupiah(stats?.qris_total)}</td></tr>
          <tr><td>Debit / EDC</td><td style="text-align: right;">${rupiah(stats?.debit_total)}</td></tr>
          <tr><td>Saldo Member</td><td style="text-align: right;">${rupiah(stats?.member_balance_total)}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="footer">
      Laporan dikirim otomatis oleh Playtopia POS Automation ke <strong>${recipient}</strong>.<br>
      Senayan Park · Lantai 2 · Jakarta Pusat
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
Rekap Harian Playtopia POS - ${dateFormatted}
---------------------------------------------
Total Omset      : ${rupiah(stats?.total_revenue)}
Total Transaksi  : ${stats?.total_transactions || 0}
Total Pengunjung : ${visitorsCount || 0}
Playground       : ${rupiah(stats?.playground_sales)}
Cafe             : ${rupiah(stats?.cafe_sales)}
---------------------------------------------
Playtopia POS System
  `.trim();

  return await sendEmail({ to: recipient, subject, html, text });
}

/**
 * Mengirim email uji coba / tes koneksi
 */
export async function sendTestEmail(targetEmail = DEFAULT_REPORT_EMAIL) {
  const recipient = targetEmail || DEFAULT_REPORT_EMAIL;
  const now = new Date().toLocaleString('id-ID');

  const subject = `[Playtopia POS] Tes Verifikasi Sistem Email Otomatis`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 20px; }
    .card { max-width: 500px; margin: 0 auto; background: #fff; border-radius: 10px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    h2 { color: #00729c; margin-top: 0; }
    .status { background: #dcfce7; color: #166534; padding: 10px; border-radius: 6px; font-weight: 700; font-size: 14px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Playtopia POS - Verifikasi Email</h2>
    <div class="status">✓ Konfigurasi Email Berfungsi Normal</div>
    <p style="font-size: 13px; color: #475569; margin-top: 14px;">
      Email ini dikirim sebagai pengujian fitur <strong>Laporan Otomatis via Email</strong> sistem POS Playtopia.
    </p>
    <ul style="font-size: 13px; color: #334155;">
      <li><strong>Tujuan:</strong> ${recipient}</li>
      <li><strong>Waktu:</strong> ${now}</li>
      <li><strong>Status:</strong> Terhubung &amp; Siap Mengirim Laporan</li>
    </ul>
    <p style="font-size: 11px; color: #94a3b8; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
      Playtopia POS System · Playground &amp; Cafe
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `Playtopia POS - Verifikasi Email Berhasil!\nEmail ini dikirim ke ${recipient} pada ${now}.\nSistem laporan via email aktif dan siap digunakan.`;

  return await sendEmail({ to: recipient, subject, html, text });
}
