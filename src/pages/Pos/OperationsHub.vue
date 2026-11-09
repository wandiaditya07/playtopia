<template>
  <div class="pt-ops-page">
    <!-- Top Page Bar -->
    <div class="pt-page-bar d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
      <div>
        <h5 class="mb-0 fw-semibold text-dark">{{ currentTitle }}</h5>
        <div class="text-muted" style="font-size: 12.5px;">{{ currentSubtitle }}</div>
      </div>

      <div class="d-flex flex-wrap align-items-center gap-2">
        <button
          v-if="canExport"
          type="button"
          class="pt-btn-outline"
          title="Ekspor Data ke Format CSV / Excel"
          @click="handleExport"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Ekspor CSV</span>
        </button>

        <router-link
          v-if="section === 'access_logs' || section === 'gates'"
          to="/app/simulator"
          class="pt-btn-outline text-decoration-none"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <line x1="7" y1="12" x2="17" y2="12" />
          </svg>
          <span>Simulator Gate</span>
        </router-link>

        <button
          v-if="section === 'bookings' || section === 'registrations'"
          type="button"
          class="pt-btn-outline"
          @click="showBookingModal = true"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Tambah Booking</span>
        </button>

        <button
          type="button"
          class="pt-btn-primary"
          :disabled="loading"
          @click="loadAll"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" :class="{ 'pt-spin': loading }">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span>{{ loading ? 'Memuat...' : 'Refresh' }}</span>
        </button>
      </div>
    </div>

    <!-- Alert Banner -->
    <div
      v-if="feedback"
      class="pt-alert mb-3 d-flex align-items-center justify-content-between"
      :class="feedback.type === 'danger' ? 'pt-alert-danger' : 'pt-alert-success'"
    >
      <span>{{ feedback.text }}</span>
      <button type="button" class="btn-close btn-sm" @click="feedback = null" />
    </div>

    <!-- 1. ORDERS & PAYMENTS -->
    <div v-if="section === 'orders' || section === 'payments' || section === 'sales'" class="pt-panel">
      <div class="pt-panel-header d-flex justify-content-between align-items-center">
        <span class="fw-semibold text-dark">Daftar Transaksi &amp; Pembayaran</span>
        <span class="pt-tag">{{ orders.length }} Transaksi</span>
      </div>
      <div class="table-responsive">
        <table class="table pt-table align-middle mb-0">
          <thead>
            <tr>
              <th>No. Invoice</th>
              <th>Waktu</th>
              <th>Petugas Kasir</th>
              <th>Pelanggan</th>
              <th>Metode Bayar</th>
              <th>Subtotal</th>
              <th>Diskon</th>
              <th>Total Bayar</th>
              <th class="text-end">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="orders.length === 0">
              <td colspan="9" class="text-center text-muted py-4">Belum ada data transaksi.</td>
            </tr>
            <tr v-for="o in orders" :key="o.id">
              <td class="font-monospace fw-semibold text-dark">{{ o.order_number }}</td>
              <td class="text-muted" style="font-size: 12.5px;">{{ fmtDateTime(o.created_at) }}</td>
              <td>{{ o.cashier_name || 'Kasir' }}</td>
              <td>{{ o.member_name || 'Umum' }}</td>
              <td>
                <span class="pt-dir-badge in">{{ (o.payment_method || 'CASH').toUpperCase() }}</span>
              </td>
              <td>{{ rupiah(o.subtotal) }}</td>
              <td class="text-danger">-{{ rupiah(o.discount_amount) }}</td>
              <td class="fw-semibold text-dark">{{ rupiah(o.total) }}</td>
              <td class="text-end">
                <span class="pt-status-badge allowed">Lunas</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 2. ITEM SALES REPORT -->
    <div v-else-if="section === 'items'" class="pt-panel">
      <div class="pt-panel-header d-flex justify-content-between align-items-center">
        <span class="fw-semibold text-dark">Ringkasan Penjualan per Produk</span>
        <span class="pt-tag">{{ sysData.item_sales.length }} Item</span>
      </div>
      <div class="table-responsive">
        <table class="table pt-table align-middle mb-0">
          <thead>
            <tr>
              <th>Kode SKU</th>
              <th>Nama Produk / Paket</th>
              <th>Kategori Unit</th>
              <th> Terjual</th>
              <th class="text-end">Total Pendapatan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="sysData.item_sales.length === 0">
              <td colspan="5" class="text-center text-muted py-4">Belum ada data penjualan produk.</td>
            </tr>
            <tr v-for="it in sysData.item_sales" :key="it.id">
              <td class="font-monospace text-muted">{{ it.sku }}</td>
              <td class="fw-semibold text-dark">{{ it.name }}</td>
              <td><span class="pt-tag">{{ it.unit_name }}</span></td>
              <td class="fw-medium">{{ it.total_qty }} item</td>
              <td class="text-end fw-semibold text-dark">{{ rupiah(it.total_revenue) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 3. ACCESS LOGS & VISITORS REPORT -->
    <template v-else-if="section === 'access_logs' || section === 'visitors_report'">
      <!-- Summary Metrics -->
      <div class="row g-3 mb-3">
        <div class="col-sm-6 col-xl-3">
          <div class="pt-stat-card">
            <div class="text-muted fw-medium" style="font-size: 12px;">Total Aktivitas Scan</div>
            <div class="d-flex align-items-baseline justify-content-between mt-1">
              <span class="pt-stat-val text-dark">{{ accessLogs.length }}</span>
              <span class="pt-tag">Semua Jalur</span>
            </div>
          </div>
        </div>
        <div class="col-sm-6 col-xl-3">
          <div class="pt-stat-card">
            <div class="text-muted fw-medium" style="font-size: 12px;">Akses Diizinkan</div>
            <div class="d-flex align-items-baseline justify-content-between mt-1">
              <span class="pt-stat-val text-success">{{ accessLogs.filter(l => l.is_allowed).length }}</span>
              <span class="pt-status-badge allowed">Valid</span>
            </div>
          </div>
        </div>
        <div class="col-sm-6 col-xl-3">
          <div class="pt-stat-card">
            <div class="text-muted fw-medium" style="font-size: 12px;">Akses Ditolak</div>
            <div class="d-flex align-items-baseline justify-content-between mt-1">
              <span class="pt-stat-val text-danger">{{ accessLogs.filter(l => !l.is_allowed).length }}</span>
              <span class="pt-status-badge denied">Ditolak</span>
            </div>
          </div>
        </div>
        <div class="col-sm-6 col-xl-3">
          <div class="pt-stat-card">
            <div class="text-muted fw-medium" style="font-size: 12px;">Rasio Masuk / Keluar</div>
            <div class="d-flex align-items-baseline justify-content-between mt-1">
              <span class="pt-stat-val text-dark">
                {{ accessLogs.filter(l => String(l.direction).toUpperCase() === 'IN').length }}
                <span class="text-muted fw-normal" style="font-size: 15px;">/ {{ accessLogs.filter(l => String(l.direction).toUpperCase() === 'OUT').length }}</span>
              </span>
              <span class="pt-tag">IN / OUT</span>
            </div>
          </div>
        </div>
      </div>

      <div class="pt-panel">
        <div class="pt-panel-header d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div class="d-flex align-items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <span class="fw-semibold text-dark">Daftar Riwayat Scan Turnstile Gate</span>
            <span class="pt-tag">{{ filteredAccessLogs.length }} Data</span>
          </div>

          <!-- Clean Filter Controls -->
          <div class="d-flex flex-wrap align-items-center gap-2">
            <input
              v-model.trim="logSearch"
              type="text"
              class="form-control form-control-sm"
              style="width: 190px; font-size: 12.5px;"
              placeholder="Cari kode tiket..."
            >
            <select v-model="logDirFilter" class="form-select form-select-sm" style="width: 130px; font-size: 12.5px;">
              <option value="ALL">Semua Jalur</option>
              <option value="IN">Masuk (IN)</option>
              <option value="OUT">Keluar (OUT)</option>
            </select>
            <select v-model="logStatusFilter" class="form-select form-select-sm" style="width: 135px; font-size: 12.5px;">
              <option value="ALL">Semua Status</option>
              <option value="ALLOWED">Diizinkan</option>
              <option value="DENIED">Ditolak</option>
            </select>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table pt-table align-middle mb-0">
            <thead>
              <tr>
                <th style="width: 190px;">Waktu Scan</th>
                <th style="width: 130px;">Jalur Gate</th>
                <th>Kode Tiket / Kredensial</th>
                <th style="width: 150px;">Status Gate</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredAccessLogs.length === 0">
                <td colspan="5" class="text-center text-muted py-4">Tidak ada aktivitas scan yang sesuai filter.</td>
              </tr>
              <tr v-for="l in filteredAccessLogs" :key="l.id">
                <td class="font-monospace text-muted" style="font-size: 12.5px;">{{ fmtDateTime(l.scanned_at) }}</td>
                <td>
                  <span class="pt-dir-badge" :class="String(l.direction).toUpperCase() === 'IN' ? 'in' : 'out'">
                    {{ String(l.direction).toUpperCase() === 'IN' ? 'MASUK (IN)' : 'KELUAR (OUT)' }}
                  </span>
                </td>
                <td class="font-monospace fw-semibold text-dark">{{ l.ticket_code || l.credential_value }}</td>
                <td>
                  <span class="pt-status-badge" :class="l.is_allowed ? 'allowed' : 'denied'">
                    {{ l.is_allowed ? 'Diizinkan' : 'Ditolak' }}
                  </span>
                </td>
                <td class="text-muted" style="font-size: 12.5px;">{{ formatDenyReason(l.deny_reason, l.is_allowed) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- 4. GATES & HARDWARE DEVICES -->
    <div v-else-if="section === 'gates'" class="row g-3">
      <div v-for="g in sysData.gates" :key="g.id" class="col-md-6">
        <div class="pt-panel p-3 h-100 d-flex flex-column justify-content-between">
          <div>
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="pt-tag font-monospace">{{ g.code }}</span>
              <span class="pt-status-badge allowed">Online</span>
            </div>
            <h6 class="fw-semibold text-dark mb-1">{{ g.name }}</h6>
            <div class="text-muted" style="font-size: 12.5px;">
              Jalur: <strong class="text-dark">{{ g.direction.toUpperCase() }}</strong> &middot; Lokasi: {{ g.location || 'Pintu Utama' }}
            </div>
          </div>

          <div class="d-flex justify-content-between align-items-center pt-3 mt-3 border-top">
            <span class="text-muted" style="font-size: 12px;">
              Sinkronisasi terakhir: {{ g.last_heartbeat_at ? fmtDateTime(g.last_heartbeat_at) : 'Baru saja' }}
            </span>
            <router-link to="/app/simulator" class="pt-btn-outline text-decoration-none" style="padding: 5px 11px; font-size: 12px;">
              Uji Gate
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- 5. BOOKINGS & ONLINE REGISTRATIONS -->
    <div v-else-if="section === 'bookings' || section === 'registrations'" class="pt-panel">
      <div class="pt-panel-header d-flex justify-content-between align-items-center">
        <span class="fw-semibold text-dark">Daftar Reservasi &amp; Booking Rombongan</span>
        <span class="pt-tag">{{ bookings.length }} Jadwal</span>
      </div>
      <div class="table-responsive">
        <table class="table pt-table align-middle mb-0">
          <thead>
            <tr>
              <th>Kode Booking</th>
              <th>Nama Pemesan</th>
              <th>No. Telepon</th>
              <th>Jadwal Kunjungan</th>
              <th>Jumlah Peserta</th>
              <th>Total Biaya</th>
              <th class="text-end">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="bookings.length === 0">
              <td colspan="7" class="text-center text-muted py-4">
                Belum ada jadwal reservasi rombongan.
              </td>
            </tr>
            <tr v-for="b in bookings" :key="b.id">
              <td class="font-monospace fw-semibold text-dark">{{ b.booking_code }}</td>
              <td class="fw-medium text-dark">{{ b.customer_name }}</td>
              <td>{{ b.customer_phone }}</td>
              <td>{{ b.booking_date }} ({{ b.start_time }} - {{ b.end_time }})</td>
              <td><span class="pt-tag">{{ b.guest_count }} Anak</span></td>
              <td class="fw-semibold text-dark">{{ rupiah(b.total) }}</td>
              <td class="text-end">
                <span class="pt-status-badge allowed">{{ b.status.toUpperCase() }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 6. OUTLETS & OPERATIONAL SETTINGS -->
    <div v-else-if="section === 'outlets' || section === 'settings'" class="row g-3">
      <div class="col-lg-5">
        <div class="pt-panel h-100">
          <div class="pt-panel-header d-flex justify-content-between align-items-center">
            <span class="fw-semibold text-dark">Daftar Cabang Outlet</span>
            <span class="pt-tag">{{ sysData.outlets.length }} Cabang</span>
          </div>
          <div class="p-3 d-flex flex-column gap-2">
            <div v-for="o in sysData.outlets" :key="o.id" class="p-3 rounded-2 border bg-light">
              <div class="d-flex justify-content-between align-items-center">
                <strong class="text-dark" style="font-size: 13.5px;">{{ o.name }}</strong>
                <span class="pt-tag font-monospace">{{ o.code }}</span>
              </div>
              <div class="text-muted mt-1" style="font-size: 12.5px;">{{ o.address }}, {{ o.city }}</div>
              <div class="text-muted mt-1" style="font-size: 12px;">{{ o.phone }} &middot; {{ o.timezone }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-7">
        <div class="pt-panel h-100">
          <div class="pt-panel-header d-flex justify-content-between align-items-center">
            <span class="fw-semibold text-dark">Parameter Operasional</span>
            <button type="button" class="pt-btn-primary" style="padding: 5px 12px; font-size: 12px;" :disabled="saving" @click="saveSettings">
              {{ saving ? 'Menyimpan...' : 'Simpan Perubahan' }}
            </button>
          </div>
          <div class="p-3">
            <div v-for="(s, idx) in sysData.settings" :key="idx" class="mb-3">
              <label class="form-label fw-semibold text-secondary mb-1" style="font-size: 12px;">{{ s.key_name }}</label>
              <input v-model="s.value_jsonStr" type="text" class="form-control font-monospace" style="font-size: 13px;">
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 7. AUDIT LOGS -->
    <div v-else-if="section === 'audit'" class="pt-panel">
      <div class="pt-panel-header d-flex justify-content-between align-items-center">
        <span class="fw-semibold text-dark">Log Audit Aktivitas</span>
        <span class="pt-tag">{{ sysData.audit_logs.length }} Catatan</span>
      </div>
      <div class="table-responsive">
        <table class="table pt-table align-middle mb-0">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Pengguna</th>
              <th>Aksi</th>
              <th>Entitas</th>
              <th class="text-end">Alamat IP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="sysData.audit_logs.length === 0">
              <td colspan="5" class="text-center text-muted py-4">Belum ada catatan aktivitas.</td>
            </tr>
            <tr v-for="a in sysData.audit_logs" :key="a.id">
              <td class="text-muted" style="font-size: 12.5px;">{{ fmtDateTime(a.created_at) }}</td>
              <td class="fw-medium text-dark">{{ a.user_name || 'Sistem' }}</td>
              <td><span class="pt-tag">{{ a.action }}</span></td>
              <td class="font-monospace text-muted" style="font-size: 12.5px;">{{ a.entity_type }} #{{ a.entity_id }}</td>
              <td class="font-monospace text-muted text-end" style="font-size: 12.5px;">{{ a.ip_address || '127.0.0.1' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 8. JADWAL & LAPORAN OTOMATIS VIA EMAIL (Feature 14) -->
    <div v-else-if="section === 'schedules'" class="row g-3">
      <div class="col-lg-6">
        <div class="pt-panel h-100">
          <div class="pt-panel-header d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center gap-2">
              <span class="fw-semibold text-dark">Konfigurasi Laporan Otomatis via Email</span>
              <span class="badge" style="background-color: #e0f2fe; color: #0284c7; font-size: 11px;">Fitur #14</span>
            </div>
            <span class="pt-tag" :class="emailConfig.smtp_configured ? 'text-success' : 'text-primary'">
              {{ emailConfig.smtp_configured ? 'SMTP Aktif' : 'Engine Aktif (Simulasi/Log)' }}
            </span>
          </div>
          <div class="p-3">
            <div class="alert alert-info py-2 px-3 small mb-3">
              <strong>Otomatisasi Laporan Aktif:</strong> Laporan operasional dikirim otomatis setiap malam pukul <strong>22:00 WIB</strong> dan setiap kali kasir melakukan <strong>Tutup Shift (Closing)</strong>.
            </div>

            <!-- Target Email Input -->
            <div class="mb-3">
              <label class="form-label fw-semibold text-secondary mb-1" style="font-size: 12px;">Alamat Email Penerima Laporan (Owner / Manajemen)</label>
              <div class="input-group">
                <span class="input-group-text bg-white text-muted">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </span>
                <input
                  v-model.trim="emailTarget"
                  type="email"
                  class="form-control font-monospace"
                  placeholder="testgmailjs@gmail.com"
                />
              </div>
              <small class="text-muted d-block mt-1" style="font-size: 11px;">
                Semua rekap harian dan notifikasi selisih kas closing dikirim ke alamat ini.
              </small>
            </div>

            <!-- Jadwal Info -->
            <div class="p-3 rounded border bg-light mb-3" style="font-size: 12.5px;">
              <div class="d-flex justify-content-between py-1 border-bottom">
                <span class="text-muted">Jadwal Rekap Harian:</span>
                <strong class="text-dark">Setiap Hari pk 22:00 WIB</strong>
              </div>
              <div class="d-flex justify-content-between py-1 border-bottom">
                <span class="text-muted">Laporan Closing Shift:</span>
                <strong class="text-success">Otomatis saat Kasir Tutup Shift</strong>
              </div>
              <div class="d-flex justify-content-between py-1">
                <span class="text-muted">Pengiriman Terakhir:</span>
                <span class="text-dark">{{ emailConfig.last_sent_at ? fmtDateTime(emailConfig.last_sent_at) : 'Belum pernah dipicu' }}</span>
              </div>
            </div>

            <!-- Feedback Alert -->
            <div v-if="emailFeedback" class="alert py-2 px-3 small mb-3" :class="emailFeedback.type === 'success' ? 'alert-success' : 'alert-danger'">
              {{ emailFeedback.text }}
            </div>

            <!-- Action Buttons -->
            <div class="d-flex flex-wrap gap-2">
              <button
                type="button"
                class="pt-btn-primary d-flex align-items-center gap-1"
                :disabled="sendingEmail"
                @click="sendDailyReportNow"
              >
                <span v-if="sendingEmail" class="spinner-border spinner-border-sm me-1" />
                <span>Kirim Laporan Harian Sekarang</span>
              </button>
              <button
                type="button"
                class="pt-btn-outline d-flex align-items-center gap-1"
                :disabled="sendingEmail"
                @click="sendTestEmailNow"
              >
                <span>Kirim Tes Verifikasi Email</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-6">
        <div class="pt-panel h-100">
          <div class="pt-panel-header d-flex justify-content-between align-items-center">
            <span class="fw-semibold text-dark">Pratinjau Data Rekap Harian Hari Ini</span>
            <span class="pt-tag">Live Today</span>
          </div>
          <div class="p-3">
            <div class="row g-2 mb-3">
              <div class="col-4">
                <div class="p-2 rounded bg-light border text-center">
                  <div class="text-muted small" style="font-size: 11px;">Total Omset</div>
                  <strong class="text-primary d-block mt-1" style="font-size: 14px;">{{ rupiah(dailyPreview?.stats?.total_revenue || 0) }}</strong>
                </div>
              </div>
              <div class="col-4">
                <div class="p-2 rounded bg-light border text-center">
                  <div class="text-muted small" style="font-size: 11px;">Playground</div>
                  <strong class="text-dark d-block mt-1" style="font-size: 14px;">{{ rupiah(dailyPreview?.stats?.playground_sales || 0) }}</strong>
                </div>
              </div>
              <div class="col-4">
                <div class="p-2 rounded bg-light border text-center">
                  <div class="text-muted small" style="font-size: 11px;">Cafe &amp; Snack</div>
                  <strong class="text-dark d-block mt-1" style="font-size: 14px;">{{ rupiah(dailyPreview?.stats?.cafe_sales || 0) }}</strong>
                </div>
              </div>
            </div>

            <div class="border rounded p-3 bg-light font-monospace small" style="font-size: 12px; line-height: 1.6;">
              <div class="fw-bold text-dark border-bottom pb-1 mb-2">FORMAT EMAIL YANG AKAN DITERIMA:</div>
              <div>Subjek: [Playtopia POS] Rekap Harian Otomatis - {{ new Date().toLocaleDateString('id-ID') }}</div>
              <div>Penerima: {{ emailTarget }}</div>
              <div>----------------------------------------</div>
              <div>- Total Transaksi: {{ dailyPreview?.stats?.total_transactions || 0 }} Trx</div>
              <div>- Total Pengunjung: {{ dailyPreview?.visitorsCount || 0 }} Orang</div>
              <div>- Omset Playground: {{ rupiah(dailyPreview?.stats?.playground_sales || 0) }}</div>
              <div>- Omset Cafe &amp; F&amp;B: {{ rupiah(dailyPreview?.stats?.cafe_sales || 0) }}</div>
              <div>- Tunai: {{ rupiah(dailyPreview?.stats?.cash_total || 0) }}</div>
              <div>- Non-Tunai (QRIS/EDC/Member): {{ rupiah((dailyPreview?.stats?.qris_total || 0) + (dailyPreview?.stats?.debit_total || 0) + (dailyPreview?.stats?.member_balance_total || 0)) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Booking -->
    <div v-if="showBookingModal" class="pt-modal-backdrop">
      <div class="pt-panel" style="max-width: 460px; width: 100%;">
        <div class="pt-panel-header d-flex justify-content-between align-items-center">
          <span class="fw-semibold text-dark">Tambah Booking Rombongan</span>
          <button type="button" class="btn-close btn-sm" @click="showBookingModal = false" />
        </div>
        <div class="p-3">
          <div class="mb-2">
            <label class="form-label small fw-semibold">Nama Pemesan / Instansi</label>
            <input v-model.trim="bookingForm.customer_name" type="text" class="form-control" placeholder="Nama pemesan atau sekolah">
          </div>
          <div class="row g-2 mb-2">
            <div class="col-6">
              <label class="form-label small fw-semibold">No. Telepon</label>
              <input v-model.trim="bookingForm.customer_phone" type="text" class="form-control" placeholder="0812...">
            </div>
            <div class="col-6">
              <label class="form-label small fw-semibold">Tanggal Kunjungan</label>
              <input v-model="bookingForm.booking_date" type="date" class="form-control">
            </div>
          </div>
          <div class="row g-2 mb-3">
            <div class="col-6">
              <label class="form-label small fw-semibold">Jumlah Peserta</label>
              <input v-model.number="bookingForm.guest_count" type="number" min="5" class="form-control">
            </div>
            <div class="col-6">
              <label class="form-label small fw-semibold">Total Biaya (Rp)</label>
              <input v-model.number="bookingForm.total" type="number" step="100000" class="form-control">
            </div>
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="pt-btn-outline" @click="showBookingModal = false">Batal</button>
            <button
              type="button"
              class="pt-btn-primary"
              :disabled="!bookingForm.customer_name || !bookingForm.customer_phone || saving"
              @click="createBooking"
            >
              {{ saving ? 'Menyimpan...' : 'Simpan Booking' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/utils/posApi'
import { rupiah, fmtDateTime } from '@/utils/format'

const route = useRoute()

const section = computed(() => {
  const p = route.path
  if (p.includes('/payments')) return 'payments'
  if (p.includes('/access/logs')) return 'access_logs'
  if (p.includes('/gates')) return 'gates'
  if (p.includes('/bookings')) return 'bookings'
  if (p.includes('/registrations')) return 'registrations'
  if (p.includes('/reports/schedules')) return 'schedules'
  if (p.includes('/reports/items')) return 'items'
  if (p.includes('/reports/visitors')) return 'visitors_report'
  if (p.includes('/reports/sales')) return 'sales'
  if (p.includes('/system/outlets')) return 'outlets'
  if (p.includes('/system/settings')) return 'settings'
  if (p.includes('/system/audit-logs')) return 'audit'
  return 'orders'
})

const currentTitle = computed(() => {
  const map = {
    orders: 'Daftar Transaksi POS',
    payments: 'Rekonsiliasi Pembayaran',
    access_logs: 'Riwayat Scan Turnstile Gate',
    gates: 'Perangkat Turnstile Gate',
    bookings: 'Booking Rombongan',
    registrations: 'Registrasi Tiket Online',
    sales: 'Laporan Penjualan',
    schedules: 'Laporan Otomatis via Email (Fitur #14)',
    items: 'Penjualan per Produk & Paket',
    visitors_report: 'Laporan Kunjungan',
    outlets: 'Cabang Outlet',
    settings: 'Pengaturan Operasional',
    audit: 'Log Audit Aktivitas'
  }
  return map[section.value] || 'Operasional Playtopia'
})

const currentSubtitle = computed(() => {
  const map = {
    orders: 'Riwayat invoice penjualan tiket playground dan transaksi cafe',
    payments: 'Rekapitulasi penerimaan pembayaran tunai, QRIS, kartu EDC, dan saldo member',
    access_logs: 'Catatan aktivitas pemindaian tiket masuk dan keluar pada perangkat gate',
    gates: 'Status koneksi dan konfigurasi jalur perangkat turnstile gate',
    bookings: 'Manajemen jadwal reservasi grup, sekolah, dan acara ulang tahun',
    registrations: 'Daftar pemesanan dan registrasi tiket kunjungan secara daring',
    sales: 'Ringkasan transaksi penjualan harian dan rekapitulasi shift',
    schedules: 'Konfigurasi otomatisasi pengiriman rekap penjualan harian dan closing shift ke email owner/manajemen',
    items: 'Performa penjualan berdasarkan masing-masing paket tiket dan produk',
    visitors_report: 'Rekapitulasi trafik kunjungan dan durasi bermain pengunjung',
    outlets: 'Informasi lokasi dan jam operasional cabang Playtopia',
    settings: 'Konfigurasi parameter waktu bermain, toleransi, dan aturan sistem',
    audit: 'Riwayat perubahan data dan aktivitas pengguna di dalam sistem'
  }
  return map[section.value] || 'Manajemen operasional Playtopia'
})

const loading = ref(false)
const saving = ref(false)
const feedback = ref(null)
const orders = ref([])
const accessLogs = ref([])
const bookings = ref([])
const logSearch = ref('')
const logDirFilter = ref('ALL')
const logStatusFilter = ref('ALL')

const filteredAccessLogs = computed(() => {
  return accessLogs.value.filter(l => {
    const code = String(l.ticket_code || l.credential_value || '').toLowerCase()
    if (logSearch.value && !code.includes(logSearch.value.toLowerCase())) return false
    const dir = String(l.direction || '').toUpperCase()
    if (logDirFilter.value !== 'ALL' && dir !== logDirFilter.value) return false
    if (logStatusFilter.value === 'ALLOWED' && !l.is_allowed) return false
    if (logStatusFilter.value === 'DENIED' && l.is_allowed) return false
    return true
  })
})

function formatDenyReason(reason, isAllowed) {
  if (isAllowed) return 'Akses valid'
  const map = {
    TICKET_NOT_FOUND: 'Tiket tidak ditemukan',
    OVERTIME: 'Melewati batas durasi bermain (Overtime)',
    REENTRY_LIMIT_EXCEEDED: 'Melebihi batas kuota re-entry',
    ALREADY_INSIDE: 'Pengunjung tercatat masih di dalam area',
    NOT_INSIDE: 'Tiket belum tercatat masuk area',
    EXPIRED: 'Masa berlaku tiket telah habis'
  }
  return map[reason] || reason || 'Akses ditolak'
}
const sysData = reactive({
  outlets: [],
  gates: [],
  settings: [],
  audit_logs: [],
  item_sales: []
})

const showBookingModal = ref(false)
const bookingForm = reactive({
  customer_name: '',
  customer_phone: '',
  booking_date: new Date().toISOString().slice(0, 10),
  guest_count: 15,
  total: 1500000
})

async function loadAll() {
  loading.value = true
  try {
    const [txRes, logRes, bookRes, sysRes] = await Promise.all([
      api('/transactions'),
      api('/simulator/logs'),
      api('/admin/bookings'),
      api('/admin/system-data')
    ])
    if (txRes.success) orders.value = txRes.data || []
    if (logRes.success) accessLogs.value = logRes.data || []
    if (bookRes.success) bookings.value = bookRes.data || []
    if (sysRes.success && sysRes.data) {
      sysData.outlets = sysRes.data.outlets || []
      sysData.gates = sysRes.data.gates || []
      sysData.settings = (sysRes.data.settings || []).map(s => ({
        ...s,
        value_jsonStr: typeof s.value_json === 'string' ? s.value_json : JSON.stringify(s.value_json)
      }))
      sysData.audit_logs = sysRes.data.audit_logs || []
      sysData.item_sales = sysRes.data.item_sales || []
    }
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  } finally {
    loading.value = false
  }
}

async function createBooking() {
  saving.value = true
  try {
    await api('/admin/bookings', { method: 'POST', body: { ...bookingForm } })
    showBookingModal.value = false
    feedback.value = { type: 'success', text: `Jadwal booking untuk ${bookingForm.customer_name} berhasil disimpan.` }
    await loadAll()
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  } finally {
    saving.value = false
  }
}

async function saveSettings() {
  saving.value = true
  try {
    for (const s of sysData.settings) {
      await api('/admin/settings', {
        method: 'PUT',
        body: { key_name: s.key_name, value_json: s.value_jsonStr }
      })
    }
    feedback.value = { type: 'success', text: 'Parameter operasional berhasil diperbarui.' }
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  } finally {
    saving.value = false
  }
}

const canExport = computed(() => {
  return ['orders', 'payments', 'sales', 'items', 'access_logs', 'visitors_report', 'bookings', 'registrations', 'audit'].includes(section.value)
})

function downloadCsv(filename, headers, rows) {
  const escapeCell = (val) => {
    if (val === null || val === undefined) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }
  const csvContent = '\uFEFF' + [
    headers.map(escapeCell).join(','),
    ...rows.map(r => r.map(escapeCell).join(','))
  ].join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.setAttribute('download', `${filename}-${new Date().toISOString().slice(0, 10)}.csv`)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function handleExport() {
  try {
    if (['orders', 'payments', 'sales'].includes(section.value)) {
      if (orders.value.length === 0) {
        feedback.value = { type: 'danger', text: 'Tidak ada data transaksi untuk diekspor.' }
        return
      }
      const headers = ['No. Invoice', 'Waktu Transaksi', 'Kasir', 'Pelanggan', 'Metode Bayar', 'Subtotal (Rp)', 'Diskon (Rp)', 'Total Bayar (Rp)', 'Status']
      const rows = orders.value.map(o => [
        o.order_number,
        fmtDateTime(o.created_at),
        o.cashier_name || 'Kasir',
        o.member_name || 'Umum',
        (o.payment_method || 'CASH').toUpperCase(),
        o.subtotal || 0,
        o.discount_amount || 0,
        o.total || 0,
        'Lunas'
      ])
      downloadCsv('Playtopia-Laporan-Transaksi', headers, rows)
      feedback.value = { type: 'success', text: `Berhasil mengekspor ${rows.length} data transaksi ke file CSV!` }
    } else if (section.value === 'items') {
      if (sysData.item_sales.length === 0) {
        feedback.value = { type: 'danger', text: 'Tidak ada data penjualan item untuk diekspor.' }
        return
      }
      const headers = ['SKU Produk', 'Nama Produk / Paket', 'Kategori Unit', 'Qty Terjual', 'Total Pendapatan (Rp)']
      const rows = sysData.item_sales.map(it => [
        it.sku,
        it.name,
        it.unit_name,
        it.total_qty || 0,
        it.total_revenue || 0
      ])
      downloadCsv('Playtopia-Penjualan-Item', headers, rows)
      feedback.value = { type: 'success', text: `Berhasil mengekspor ${rows.length} data produk ke file CSV!` }
    } else if (['access_logs', 'visitors_report'].includes(section.value)) {
      if (filteredAccessLogs.value.length === 0) {
        feedback.value = { type: 'danger', text: 'Tidak ada log aktivitas scan gate untuk diekspor.' }
        return
      }
      const headers = ['Waktu Scan', 'Jalur Gate', 'Kode Tiket / Kredensial', 'Status Akses', 'Keterangan Validasi']
      const rows = filteredAccessLogs.value.map(l => [
        fmtDateTime(l.scanned_at),
        String(l.direction).toUpperCase() === 'IN' ? 'MASUK (IN)' : 'KELUAR (OUT)',
        l.ticket_code || l.credential_value,
        l.is_allowed ? 'Diizinkan' : 'Ditolak',
        formatDenyReason(l.deny_reason, l.is_allowed)
      ])
      downloadCsv('Playtopia-Riwayat-Scan-Gate', headers, rows)
      feedback.value = { type: 'success', text: `Berhasil mengekspor ${rows.length} data riwayat scan ke file CSV!` }
    } else if (['bookings', 'registrations'].includes(section.value)) {
      if (bookings.value.length === 0) {
        feedback.value = { type: 'danger', text: 'Tidak ada data jadwal booking untuk diekspor.' }
        return
      }
      const headers = ['Kode Booking', 'Nama Pemesan', 'No. Telepon', 'Tanggal Kunjungan', 'Jam Mulai', 'Jam Selesai', 'Jumlah Peserta', 'Total Biaya (Rp)', 'Status']
      const rows = bookings.value.map(b => [
        b.booking_code,
        b.customer_name,
        b.customer_phone,
        b.booking_date,
        b.start_time || '10:00',
        b.end_time || '13:00',
        b.guest_count || 0,
        b.total || 0,
        (b.status || 'CONFIRMED').toUpperCase()
      ])
      downloadCsv('Playtopia-Jadwal-Booking', headers, rows)
      feedback.value = { type: 'success', text: `Berhasil mengekspor ${rows.length} data booking ke file CSV!` }
    } else if (section.value === 'audit') {
      if (sysData.audit_logs.length === 0) {
        feedback.value = { type: 'danger', text: 'Tidak ada data log audit untuk diekspor.' }
        return
      }
      const headers = ['Waktu Aktivitas', 'Pengguna', 'Aksi', 'Tipe Entitas', 'ID Entitas', 'Alamat IP']
      const rows = sysData.audit_logs.map(a => [
        fmtDateTime(a.created_at),
        a.user_name || 'Sistem',
        a.action,
        a.entity_type,
        a.entity_id,
        a.ip_address || '127.0.0.1'
      ])
      downloadCsv('Playtopia-Log-Audit-Sistem', headers, rows)
      feedback.value = { type: 'success', text: `Berhasil mengekspor ${rows.length} catatan audit ke file CSV!` }
    }
  } catch (err) {
    feedback.value = { type: 'danger', text: 'Gagal mengekspor data: ' + err.message }
  }
}

const emailTarget = ref('testgmailjs@gmail.com')
const sendingEmail = ref(false)
const emailFeedback = ref(null)
const emailConfig = reactive({
  target_email: 'testgmailjs@gmail.com',
  schedule_time: '22:00 WIB (Harian Otomatis)',
  on_shift_close: true,
  smtp_configured: false,
  last_sent_at: null
})
const dailyPreview = ref(null)

async function loadEmailConfig() {
  try {
    const [cfgRes, previewRes] = await Promise.all([
      api('/reports/email-config').catch(() => ({})),
      api('/reports/daily-stats').catch(() => ({}))
    ])
    if (cfgRes?.success && cfgRes.data) {
      Object.assign(emailConfig, cfgRes.data)
      if (cfgRes.data.target_email) emailTarget.value = cfgRes.data.target_email
    }
    if (previewRes?.success && previewRes.data) {
      dailyPreview.value = previewRes.data
    }
  } catch (err) {
    console.warn('Error loading email config:', err)
  }
}

async function sendDailyReportNow() {
  sendingEmail.value = true
  emailFeedback.value = null
  try {
    const res = await api('/reports/send-daily', {
      method: 'POST',
      body: { email: emailTarget.value.trim() }
    })
    if (res.success) {
      emailFeedback.value = {
        type: 'success',
        text: `✓ Laporan rekap harian berhasil dikirim ke: ${emailTarget.value.trim()}`
      }
      emailConfig.last_sent_at = new Date().toISOString()
    } else {
      emailFeedback.value = {
        type: 'danger',
        text: res.message || 'Gagal mengirim laporan harian.'
      }
    }
  } catch (err) {
    emailFeedback.value = {
      type: 'danger',
      text: err.message || 'Terjadi kesalahan saat memicu pengiriman laporan.'
    }
  } finally {
    sendingEmail.value = false
  }
}

async function sendTestEmailNow() {
  sendingEmail.value = true
  emailFeedback.value = null
  try {
    const res = await api('/reports/test-email', {
      method: 'POST',
      body: { email: emailTarget.value.trim() }
    })
    if (res.success) {
      emailFeedback.value = {
        type: 'success',
        text: `✓ Email uji coba (test verification) berhasil dikirim ke: ${emailTarget.value.trim()}`
      }
    } else {
      emailFeedback.value = {
        type: 'danger',
        text: res.message || 'Gagal mengirim email uji coba.'
      }
    }
  } catch (err) {
    emailFeedback.value = {
      type: 'danger',
      text: err.message || 'Gagal mengirim email uji coba.'
    }
  } finally {
    sendingEmail.value = false
  }
}

onMounted(() => {
  loadAll()
  loadEmailConfig()
})
</script>

<style scoped>
.pt-ops-page {
  max-width: 1400px;
}

.pt-page-bar {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px 18px;
}

.pt-stat-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px 18px;
}

.pt-stat-val {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
}

.pt-btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  transition: all 0.15s ease;
}

.pt-btn-outline:hover {
  background: #f8fafc;
  color: #0284c7;
  border-color: #94a3b8;
}

.pt-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 500;
  color: #ffffff;
  background: #0284c7;
  border: 1px solid #0284c7;
  border-radius: 8px;
  transition: all 0.15s ease;
}

.pt-btn-primary:hover:not(:disabled) {
  background: #0369a1;
}

.pt-btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pt-alert {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
}

.pt-alert-success {
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.pt-alert-danger {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.pt-panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}

.pt-panel-header {
  padding: 13px 18px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 14px;
}

.pt-tag {
  font-size: 11.5px;
  font-weight: 600;
  color: #475569;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 3px 9px;
  border-radius: 6px;
}

.pt-table th {
  background: #f8fafc;
  font-size: 11.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #64748b;
  border-bottom: 1px solid #e2e8f0;
  padding: 11px 16px;
}

.pt-table td {
  padding: 11px 16px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
}

.pt-dir-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 5px;
}

.pt-dir-badge.in {
  background: #e0f2fe;
  color: #0369a1;
}

.pt-dir-badge.out {
  background: #f1f5f9;
  color: #334155;
}

.pt-status-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 5px;
}

.pt-status-badge.allowed {
  background: #dcfce7;
  color: #15803d;
}

.pt-status-badge.denied {
  background: #fee2e2;
  color: #b91c1c;
}

.pt-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1055;
  padding: 16px;
}

@keyframes pt-spin {
  to { transform: rotate(360deg); }
}

.pt-spin {
  animation: pt-spin 0.8s linear infinite;
}
</style>
