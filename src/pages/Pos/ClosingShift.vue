<template>
  <div class="closing-shift-page p-3">
    <!-- Header -->
    <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 bg-white p-3 rounded shadow-sm gap-2">
      <div>
        <h4 class="m-0 fw-bold text-dark">
          Closing Shift Kasir (Playground &amp; Cafe)
        </h4>
        <small class="text-muted">Rekonsiliasi uang kas laci (cash drawer), rekap omset per divisi, dan pembukuan shift kasir.</small>
      </div>
      <div class="d-flex gap-2">
        <router-link to="/app/pos" class="btn btn-outline-primary fw-semibold">
          ← Kembali ke Kasir
        </router-link>
        <button
          class="btn btn-secondary d-flex align-items-center gap-1"
          :disabled="loading"
          @click="fetchCurrentShift"
        >
          <span v-if="loading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
          <span>{{ loading ? 'Memuat...' : 'Refresh' }}</span>
        </button>
      </div>
    </div>

    <!-- Alert status -->
    <div v-if="feedbackMsg" class="alert alert-dismissible mb-3" :class="'alert-' + feedbackType" role="alert">
      <span>{{ feedbackMsg }}</span>
      <button type="button" class="btn-close" aria-label="Close" @click="feedbackMsg = ''" />
    </div>

    <!-- Loading State -->
    <div v-if="loading && !currentShiftData" class="card shadow-sm border-0 p-5 text-center">
      <div class="spinner-border text-primary mx-auto mb-3" role="status" />
      <span class="text-muted">Memuat data shift kasir...</span>
    </div>

    <!-- Open shift -->
    <div v-else-if="!currentShiftData?.shift" class="card shadow-sm border-0 p-4 p-md-5 text-center">
      <h4 class="fw-bold mt-2">Tidak Ada Shift yang Sedang Buka</h4>
      <p class="text-muted mb-4">Silakan masukkan modal awal kas laci untuk membuka shift kasir saat ini:</p>

      <div class="col-md-5 col-lg-4 mx-auto text-start">
        <div class="mb-3">
          <label class="form-label fw-bold small text-muted">Modal Awal Kas Laci (Float Cash):</label>
          <div class="input-group">
            <span class="input-group-text">Rp</span>
            <input
              type="number"
              v-model.number="newOpeningCash"
              min="0"
              step="50000"
              class="form-control form-control-lg fw-bold"
              placeholder="0"
            />
          </div>
          <small class="text-muted">Contoh: Rp 300.000 untuk uang kembalian pagi.</small>
        </div>

        <button
          class="btn btn-play-sky btn-lg w-100 fw-bold shadow-sm"
          :disabled="isOpenShiftDisabled"
          @click="openShift"
        >
          <span v-if="submittingOpen" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
          <span>{{ submittingOpen ? 'Membuka Shift...' : '✓ Buka Shift Baru' }}</span>
        </button>
      </div>
    </div>

    <!-- Active Shift Data -->
    <div v-else class="row g-3">
      <!-- Left: Revenue & Breakdown -->
      <div class="col-lg-7">
        <div class="card shadow-sm border-0 mb-3">
          <div class="card-header card-header-sky py-3 d-flex justify-content-between align-items-center">
            <h6 class="m-0 fw-bold">Rekap Penjualan Shift #{{ currentShiftData.shift.id }}</h6>
            <span class="badge bg-white text-success fw-bold">Status: AKTIF</span>
          </div>
          <div class="card-body p-4">
            <div class="row g-3 mb-4">
              <div class="col-6">
                <div class="p-3 rounded border" style="background-color: #f0faff; border-color: #b8ebff !important;">
                  <small class="text-uppercase fw-bold text-muted">Omset Playground</small>
                  <h4 class="fw-bold m-0 mt-1" style="color: #00729c;">
                    {{ rupiah(currentShiftData.stats.playground_sales) }}
                  </h4>
                </div>
              </div>
              <div class="col-6">
                <div class="p-3 rounded border" style="background-color: #fff2fa; border-color: #ffcceb !important;">
                  <small class="text-uppercase fw-bold text-muted">Omset Cafe &amp; F&amp;B</small>
                  <h4 class="fw-bold m-0 mt-1" style="color: #99005b;">
                    {{ rupiah(currentShiftData.stats.cafe_sales) }}
                  </h4>
                </div>
              </div>
            </div>

            <div class="p-3 rounded mb-4 text-center text-white" style="background: linear-gradient(135deg, #00364d 0%, #00729c 100%);">
              <div class="text-uppercase small text-white-50 fw-semibold">
                TOTAL OMSET KESELURUHAN ({{ currentShiftData.stats.total_transactions }} Transaksi)
              </div>
              <h2 class="fw-bold m-0 mt-1">
                {{ rupiah(currentShiftData.stats.total_revenue) }}
              </h2>
            </div>

            <!-- Payment Method Breakdown -->
            <h6 class="fw-bold text-dark mb-3">Rincian Berdasarkan Metode Pembayaran</h6>
            <div class="pay-breakdown">
              <div v-for="row in paymentRows" :key="row.key" class="pay-row">
                <div class="pay-row-head">
                  <span class="pay-row-label">{{ row.label }}</span>
                  <span class="pay-row-share">{{ row.share }}%</span>
                  <span class="pay-row-amount">{{ rupiah(row.amount) }}</span>
                </div>
                <div class="pay-row-bar">
                  <div class="pay-row-bar-fill" :style="{ width: row.share + '%' }" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Cash reconciliation -->
      <div class="col-lg-5">
        <div class="card shadow-sm border-0">
          <div class="card-header bg-danger text-white py-3">
            <h6 class="m-0 fw-bold">Rekonsiliasi Kas Laci &amp; Closing</h6>
          </div>
          <div class="card-body p-4">
            <div class="mb-3 p-3 bg-light rounded border">
              <div class="d-flex justify-content-between mb-1">
                <span class="text-muted">Modal Awal Kas:</span>
                <strong>{{ rupiah(currentShiftData.shift.opening_cash) }}</strong>
              </div>
              <div class="d-flex justify-content-between mb-1">
                <span class="text-muted">Penerimaan Tunai:</span>
                <strong class="text-success">+ {{ rupiah(currentShiftData.stats.cash_total) }}</strong>
              </div>
              <div class="d-flex justify-content-between border-top pt-2 mt-2 align-items-center">
                <span class="fw-bold">Seharusnya di Laci:</span>
                <h5 class="m-0 fw-bold text-primary">
                  {{ rupiah(currentShiftData.stats.expected_cash_drawer) }}
                </h5>
              </div>
            </div>

            <!-- Input Actual Cash Counted -->
            <div class="mb-3">
              <label class="form-label fw-bold small text-muted">Hitung Uang Fisik Nyata di Laci:</label>
              <div class="input-group">
                <span class="input-group-text">Rp</span>
                <input
                  type="number"
                  v-model.number="actualClosingCash"
                  min="0"
                  step="1000"
                  class="form-control form-control-lg fw-bold text-end"
                  placeholder="0"
                />
              </div>
              <div class="d-flex gap-1 mt-2">
                <button
                  type="button"
                  class="btn btn-sm btn-outline-primary"
                  @click="actualClosingCash = currentShiftData.stats.expected_cash_drawer"
                >
                  Isi Sesuai Sistem
                </button>
              </div>
            </div>

            <!-- Cash Variance -->
            <div class="p-3 rounded mb-3" :class="varianceClass">
              <div class="d-flex justify-content-between align-items-center">
                <span>Selisih Kas Fisik:</span>
                <h4 class="m-0 fw-bold">
                  {{ (cashVariance >= 0 ? '+' : '') + rupiah(cashVariance) }}
                </h4>
              </div>
              <small class="d-block mt-1">
                {{ cashVariance === 0 ? '✓ Kas Pas (Sempurna)' : cashVariance > 0 ? 'Uang Lebih di Laci' : 'Uang Kurang / Minus di Laci' }}
              </small>
            </div>

            <!-- Notes (Wajib jika ada selisih) -->
            <div class="mb-4">
              <label class="form-label small fw-bold" :class="cashVariance !== 0 ? 'text-danger' : 'text-muted'">
                Catatan Kasir {{ cashVariance !== 0 ? '(Wajib Diisi Karena Ada Selisih):' : '(Opsional):' }}
              </label>
              <textarea
                v-model="closingNotes"
                class="form-control"
                rows="2"
                :placeholder="cashVariance !== 0 ? 'Jelaskan penyebab selisih kas...' : 'Catatan pergantian shift atau informasi penting...'"
              />
              <small v-if="cashVariance !== 0 && !closingNotes.trim()" class="text-danger">
                * Tombol tutup shift dinonaktifkan sampai catatan selisih diisi.
              </small>
            </div>

            <!-- Email Otomatis ke Owner / Manajemen (Feature 14) -->
            <div class="mb-4 p-3 rounded border" style="background-color: #f8fafc; border-color: #e2e8f0 !important;">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <label class="form-label small fw-bold text-dark m-0 d-flex align-items-center gap-1">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  Laporan Otomatis via Email
                </label>
                <span class="badge" :style="smtpConfigured ? 'background-color: #dcfce7; color: #15803d; font-size: 10px;' : 'background-color: #fef3c7; color: #b45309; font-size: 10px;'">
                  {{ smtpConfigured ? 'SMTP Gmail Aktif' : 'Perlu App Password (Admin)' }}
                </span>
              </div>

              <!-- Tampilan untuk NON-ADMIN (Kasir / Staff): Email & Kode di-hide -->
              <div v-if="!isAdmin" class="mt-1">
                <div class="p-2 rounded bg-white border d-flex align-items-center justify-content-between" style="font-size: 12px;">
                  <span class="text-muted">Tujuan Pengiriman:</span>
                  <span class="badge bg-secondary-subtle text-secondary font-monospace">Email Admin Terdaftar (Disembunyikan)</span>
                </div>
                <small class="text-muted d-block mt-1" style="font-size: 11px;">
                  Salinan rekap omset dan rekonsiliasi kas akan otomatis dikirim ke email Admin/Manajemen saat shift ditutup.
                </small>
              </div>

              <!-- Tampilan khusus ADMIN: Bisa lihat/sembunyikan dan ubah Email + 16-digit Kode App Password kapan saja -->
              <div v-else class="mt-2">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <small class="text-muted" style="font-size: 11px;">
                    Email Aktif:
                    <strong class="text-dark font-monospace">
                      {{ showAdminEmailConfig ? (ownerEmail || 'Belum diatur') : maskEmailDisplay(ownerEmail) }}
                    </strong>
                  </small>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-primary py-0 px-2"
                    style="font-size: 11px;"
                    @click="showAdminEmailConfig = !showAdminEmailConfig"
                  >
                    {{ showAdminEmailConfig ? 'Sembunyikan Pengaturan' : 'Lihat / Ubah Email & Kode (Admin)' }}
                  </button>
                </div>

                <div v-if="showAdminEmailConfig" class="p-2 rounded bg-white border mt-1">
                  <div class="mb-2">
                    <label class="form-label small fw-semibold text-muted mb-1" style="font-size: 11px;">Email Tujuan &amp; Pengirim (Admin):</label>
                    <input
                      type="email"
                      v-model="ownerEmail"
                      class="form-control form-control-sm font-monospace"
                      placeholder="Masukkan alamat Gmail baru..."
                    />
                  </div>

                  <div class="mb-2">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <label class="form-label small fw-semibold text-muted m-0" style="font-size: 11px;">
                        Kode 16-Digit Google App Password:
                      </label>
                      <a
                        href="https://myaccount.google.com/apppasswords"
                        target="_blank"
                        rel="noopener"
                        class="small text-decoration-none fw-bold"
                        style="font-size: 11px;"
                      >
                        Buat Kode Baru ↗
                      </a>
                    </div>
                    <div class="input-group input-group-sm">
                      <input
                        :type="showSmtpPassText ? 'text' : 'password'"
                        v-model="quickSmtpPass"
                        class="form-control font-monospace"
                        placeholder="16 digit kode App Password..."
                      />
                      <button
                        type="button"
                        class="btn btn-outline-secondary"
                        @click="showSmtpPassText = !showSmtpPassText"
                      >
                        {{ showSmtpPassText ? 'Sembunyikan' : 'Lihat Kode' }}
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    class="btn btn-sm btn-primary w-100 fw-semibold"
                    :disabled="savingSmtp || !ownerEmail.trim() || !quickSmtpPass.trim()"
                    @click="saveQuickSmtp"
                  >
                    {{ savingSmtp ? 'Memverifikasi & Menyimpan...' : 'Simpan Email & Kode App Password' }}
                  </button>

                  <small v-if="smtpSetupMsg" class="d-block mt-1" :class="smtpSetupSuccess ? 'text-success fw-semibold' : 'text-danger'" style="font-size: 11px;">
                    {{ smtpSetupMsg }}
                  </small>
                </div>
              </div>
            </div>

            <!-- Submit closing -->
            <button
              class="btn btn-lg w-100 py-3 fw-bold shadow-sm btn-close-shift"
              :disabled="isClosingDisabled"
              @click="submitClosing"
            >
              <span v-if="submittingClose" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
              <span>{{ submittingClose ? 'Memproses Closing...' : 'TUTUP SHIFT & REKONSILIASI' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Laporan Closing Sukses -->
    <div v-if="closingReportModal" class="modal-backdrop-custom">
      <div class="modal-dialog-custom card p-4 shadow-lg border-0" style="max-width: 550px; width: 100%;">
        <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
          <h5 class="fw-bold m-0 text-success">✓ Closing Shift Berhasil Diselesaikan!</h5>
          <button type="button" class="btn-close" @click="finishClosingModal" />
        </div>
        <p class="text-muted small mb-2">Shift telah ditutup dan rekonsiliasi kas telah tercatat ke database.</p>

        <!-- Notifikasi Status Pengiriman Email -->
        <div v-if="emailDeliveryStatus" class="alert py-2 px-3 small mb-3" :class="emailDeliveryStatus.mode === 'live_smtp' ? 'alert-success' : 'alert-warning'">
          <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
              <div v-if="emailDeliveryStatus.mode === 'live_smtp'">
                <strong>✓ Email Terkirim ke Inbox:</strong>
                <span v-if="isAdmin"> Laporan resmi telah dikirim ke <code>{{ ownerEmail }}</code></span>
                <span v-else> Laporan resmi telah dikirim otomatis ke email Manajemen/Admin terdaftar.</span>
              </div>
              <div v-else>
                <strong>Mode Simulasi:</strong>
                <span v-if="isAdmin"> File laporan HTML untuk <code>{{ ownerEmail }}</code> telah dibuat. Silakan pastikan 16-digit App Password Gmail sudah sesuai.</span>
                <span v-else> Laporan closing shift telah dicatat di sistem untuk Admin.</span>
              </div>
            </div>
            <div class="d-flex gap-1">
              <button
                type="button"
                class="btn btn-sm py-1 px-2"
                :class="emailDeliveryStatus.mode === 'live_smtp' ? 'btn-outline-success' : 'btn-outline-dark'"
                :disabled="sendingEmail"
                @click="resendEmailReport"
              >
                {{ sendingEmail ? 'Mengirim...' : 'Kirim Ulang' }}
              </button>
              <a
                v-if="isAdmin"
                :href="gmailComposeUrl"
                target="_blank"
                rel="noopener"
                class="btn btn-sm btn-danger py-1 px-2 text-white text-decoration-none"
              >
                Kirim via Gmail Web ↗
              </a>
            </div>
          </div>

          <!-- Inline App Password Input inside Modal (Hanya untuk Admin jika belum aktif) -->
          <div v-if="isAdmin && emailDeliveryStatus.mode !== 'live_smtp'" class="mt-2 pt-2 border-top border-warning-subtle">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="fw-semibold" style="font-size: 11px;">Masukkan 16-Digit Google App Password (akun {{ ownerEmail }}) untuk kirim otomatis sekarang:</span>
              <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener" class="fw-bold text-decoration-none" style="font-size: 11px;">Ambil App Password ↗</a>
            </div>
            <div class="input-group input-group-sm">
              <input
                :type="showSmtpPassText ? 'text' : 'password'"
                v-model="quickSmtpPass"
                class="form-control font-monospace"
                placeholder="16 digit App Password Gmail..."
              />
              <button
                type="button"
                class="btn btn-outline-secondary"
                @click="showSmtpPassText = !showSmtpPassText"
              >
                {{ showSmtpPassText ? 'Sembunyikan' : 'Lihat Kode' }}
              </button>
              <button
                type="button"
                class="btn btn-primary fw-bold"
                :disabled="savingSmtp || !quickSmtpPass.trim()"
                @click="saveQuickSmtpAndResend"
              >
                {{ savingSmtp ? 'Memverifikasi...' : 'Simpan & Kirim' }}
              </button>
            </div>
            <small v-if="smtpSetupMsg" class="d-block mt-1" :class="smtpSetupSuccess ? 'text-success fw-bold' : 'text-danger'">
              {{ smtpSetupMsg }}
            </small>
          </div>
        </div>

        <div class="bg-light p-3 rounded font-monospace small mb-3 w-100 border text-dark" style="white-space: pre-wrap; max-height: 280px; overflow-y: auto; line-height: 1.55;">{{ reportText }}</div>
        <div class="d-flex justify-content-end gap-2">
          <button class="btn btn-outline-secondary" type="button" @click="printReport">
            Cetak Ringkasan
          </button>
          <button class="btn btn-primary fw-bold" type="button" @click="finishClosingModal">
            Selesai
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/utils/posApi'
import { rupiah, fmtDateTime } from '@/utils/format'
import { usePosAuthStore } from '@/stores/posAuth'

const auth = usePosAuthStore()
const isAdmin = computed(() => auth.user?.role === 'Admin' || Number(auth.user?.role_id) === 2)

const currentShiftData = ref(null)
const loading = ref(false)
const submittingOpen = ref(false)
const submittingClose = ref(false)

const feedbackMsg = ref('')
const feedbackType = ref('success')

const newOpeningCash = ref(300000)
const actualClosingCash = ref(0)
const closingNotes = ref('')

const closingReportModal = ref(false)
const reportText = ref('')
const ownerEmail = ref('rnurfadil5@gmail.com')
const emailDeliveryStatus = ref(null)
const sendingEmail = ref(false)
const closedShiftId = ref(null)

const smtpConfigured = ref(false)
const quickSmtpPass = ref('')
const savingSmtp = ref(false)
const smtpSetupMsg = ref('')
const smtpSetupSuccess = ref(false)
const showAdminEmailConfig = ref(false)
const showSmtpPassText = ref(false)

function maskEmailDisplay(email) {
  const e = String(email || '').trim()
  if (!e || !e.includes('@')) return '••••••••@gmail.com'
  const [name, domain] = e.split('@')
  const visible = name.slice(0, 2)
  return `${visible}${'•'.repeat(Math.max(4, name.length - 2))}@${domain}`
}

const gmailComposeUrl = computed(() => {
  const to = encodeURIComponent((ownerEmail.value || 'rnurfadil5@gmail.com').trim())
  const subject = encodeURIComponent(`[Playtopia POS] Laporan Closing Shift #${closedShiftId.value || ''}`)
  const body = encodeURIComponent(reportText.value || '')
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`
})

async function fetchEmailConfigStatus() {
  try {
    const res = await api('/reports/email-config')
    if (res.success && res.data) {
      smtpConfigured.value = Boolean(res.data.smtp_configured)
      if (isAdmin.value && res.data.target_email) {
        ownerEmail.value = res.data.target_email
      }
      if (isAdmin.value && res.data.smtp_pass) {
        quickSmtpPass.value = res.data.smtp_pass
      }
    }
  } catch (err) {
    console.warn('Email config check error:', err)
  }
}

async function saveQuickSmtp() {
  if (!quickSmtpPass.value.trim()) return false
  savingSmtp.value = true
  smtpSetupMsg.value = ''
  try {
    const res = await api('/reports/smtp-config', {
      method: 'POST',
      body: {
        smtp_user: (ownerEmail.value || 'rnurfadil5@gmail.com').trim(),
        smtp_pass: quickSmtpPass.value.trim(),
        target_email: (ownerEmail.value || 'rnurfadil5@gmail.com').trim()
      }
    })
    if (res.success) {
      smtpConfigured.value = true
      smtpSetupSuccess.value = true
      smtpSetupMsg.value = res.message || 'SMTP Gmail berhasil diaktifkan!'
      if (res.data?.smtp_pass) {
        quickSmtpPass.value = res.data.smtp_pass
      }
      return true
    } else {
      smtpSetupSuccess.value = false
      smtpSetupMsg.value = res.message || 'Gagal memverifikasi App Password Gmail.'
      return false
    }
  } catch (err) {
    smtpSetupSuccess.value = false
    smtpSetupMsg.value = err.message || 'Gagal memverifikasi App Password Gmail.'
    return false
  } finally {
    savingSmtp.value = false
  }
}

async function saveQuickSmtpAndResend() {
  const ok = await saveQuickSmtp()
  if (ok && closedShiftId.value) {
    await resendEmailReport()
  }
}

async function fetchCurrentShift() {
  loading.value = true
  try {
    const res = await api('/shifts/current')
    if (res.success && res.data) {
      currentShiftData.value = res.data
      actualClosingCash.value = res.data.stats?.expected_cash_drawer ?? 0
    } else {
      currentShiftData.value = null
    }
  } catch (err) {
    console.error('Fetch shift error:', err)
  } finally {
    loading.value = false
  }
}

const paymentRows = computed(() => {
  const s = currentShiftData.value?.stats
  if (!s) return []
  const rows = [
    { key: 'cash', label: 'Tunai (Cash)', amount: Number(s.cash_total) || 0 },
    { key: 'qris', label: 'QRIS', amount: Number(s.qris_total) || 0 },
    { key: 'debit', label: 'Kartu EDC / Debit', amount: Number(s.debit_total) || 0 },
    { key: 'member', label: 'Saldo Member', amount: Number(s.member_balance_total) || 0 }
  ]
  const total = rows.reduce((sum, r) => sum + r.amount, 0)
  return rows.map(r => ({ ...r, share: total > 0 ? Math.round((r.amount / total) * 100) : 0 }))
})

const cashVariance = computed(() => {
  if (!currentShiftData.value?.stats) return 0
  return Number(actualClosingCash.value || 0) - currentShiftData.value.stats.expected_cash_drawer
})

const varianceClass = computed(() => {
  if (cashVariance.value === 0) return 'bg-success text-white'
  if (cashVariance.value > 0) return 'bg-warning text-dark'
  return 'bg-danger text-white'
})

const isOpenShiftDisabled = computed(() => {
  if (submittingOpen.value) return true
  if (newOpeningCash.value === null || newOpeningCash.value === undefined || Number(newOpeningCash.value) < 0) {
    return true
  }
  return false
})

const isClosingDisabled = computed(() => {
  if (submittingClose.value) return true
  if (!currentShiftData.value?.shift) return true
  if (actualClosingCash.value === null || actualClosingCash.value === undefined || Number(actualClosingCash.value) < 0) {
    return true
  }
  // Notes required on variance
  if (cashVariance.value !== 0 && !closingNotes.value.trim()) {
    return true
  }
  return false
})

async function openShift() {
  if (isOpenShiftDisabled.value) return
  submittingOpen.value = true
  try {
    const res = await api('/shifts/open', {
      method: 'POST',
      body: {
        opening_cash: Number(newOpeningCash.value)
      }
    })
    if (res.success) {
      feedbackType.value = 'success'
      feedbackMsg.value = `Shift baru #${res.data?.id || ''} berhasil dibuka dengan modal awal ${rupiah(newOpeningCash.value)}!`
      await fetchCurrentShift()
    } else {
      feedbackType.value = 'danger'
      feedbackMsg.value = res.message || 'Gagal membuka shift.'
    }
  } catch (err) {
    feedbackType.value = 'danger'
    feedbackMsg.value = err.message || 'Terjadi kesalahan sistem saat membuka shift.'
  } finally {
    submittingOpen.value = false
  }
}

async function submitClosing() {
  if (isClosingDisabled.value) return
  submittingClose.value = true
  emailDeliveryStatus.value = null
  try {
    const res = await api('/shifts/close', {
      method: 'POST',
      body: {
        actual_closing_cash: Number(actualClosingCash.value),
        notes: closingNotes.value.trim(),
        owner_email: isAdmin.value ? ownerEmail.value.trim() : ''
      }
    })

    if (res.success) {
      closedShiftId.value = res.data?.shift_id || res.data?.shift?.id
      if (res.data?.email_status) {
        emailDeliveryStatus.value = res.data.email_status
      } else {
        emailDeliveryStatus.value = { success: true, recipient: ownerEmail.value }
      }

      const emailLine = isAdmin.value
        ? `Terkirim ke ${ownerEmail.value.trim()}`
        : 'Terkirim ke Email Admin Terdaftar'

      reportText.value =
`==============================================
           LAPORAN CLOSING SHIFT
               PLAYTOPIA POS
==============================================
Shift ID      : #${res.data?.shift?.id}
Waktu Tutup   : ${fmtDateTime(new Date())}
Total Omset   : ${rupiah(res.data?.stats?.total_revenue || 0)}
- Playground  : ${rupiah(res.data?.stats?.playground_sales || 0)}
- Cafe & F&B  : ${rupiah(res.data?.stats?.cafe_sales || 0)}

REKONSILIASI KAS LACI:
Modal Awal    : ${rupiah(res.data?.shift?.opening_cash || 0)}
Penjualan Cash: +${rupiah(res.data?.stats?.cash_total || 0)}
Ekspektasi Kas: ${rupiah(res.data?.stats?.expected_cash_drawer || 0)}
Kas Fisik     : ${rupiah(actualClosingCash.value)}
Selisih Kas   : ${(cashVariance.value >= 0 ? '+' : '') + rupiah(cashVariance.value)}

Catatan Kasir : ${closingNotes.value || '-'}
Laporan Email : ${emailLine}
==============================================
Status: CLOSED & AUDITED`

      closingReportModal.value = true
      currentShiftData.value = null
      closingNotes.value = ''
    } else {
      feedbackType.value = 'danger'
      feedbackMsg.value = res.message || 'Gagal menutup shift.'
    }
  } catch (err) {
    feedbackType.value = 'danger'
    feedbackMsg.value = err.message || 'Terjadi kesalahan sistem saat menutup shift.'
  } finally {
    submittingClose.value = false
  }
}

async function resendEmailReport() {
  if (!closedShiftId.value) return
  sendingEmail.value = true
  try {
    const res = await api(`/shifts/${closedShiftId.value}/send-email`, {
      method: 'POST',
      body: { email: isAdmin.value ? ownerEmail.value.trim() : '' }
    })
    if (res.success && res.data) {
      emailDeliveryStatus.value = res.data
    }
  } catch (err) {
    console.error('Gagal kirim ulang email:', err)
  } finally {
    sendingEmail.value = false
  }
}

function finishClosingModal() {
  closingReportModal.value = false
  fetchCurrentShift()
}

function printReport() {
  window.print()
}

onMounted(() => {
  fetchCurrentShift()
  fetchEmailConfigStatus()
})
</script>

<style scoped>
.closing-shift-page {
  min-height: calc(100vh - 120px);
}

/* Rincian metode pembayaran */
.pay-breakdown {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}

.pay-row {
  padding: 14px 16px;
  border-bottom: 1px solid #eef2f6;
}

.pay-row:last-child {
  border-bottom: none;
}

.pay-row-head {
  display: grid;
  grid-template-columns: 1fr auto 140px;
  align-items: baseline;
  gap: 12px;
}

.pay-row-label {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.pay-row-share {
  font-size: 12px;
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
}

.pay-row-amount {
  text-align: right;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
}

.pay-row-bar {
  height: 4px;
  margin-top: 10px;
  background: #eef2f6;
  border-radius: 999px;
  overflow: hidden;
}

.pay-row-bar-fill {
  height: 100%;
  background: #00729c;
  border-radius: 999px;
  transition: width 0.3s ease;
}

/* Tombol tutup shift: biru laut, teks putih */
.btn-close-shift {
  background-color: #00729c;
  border: 1px solid #00729c;
  color: #fff;
  letter-spacing: 0.3px;
  transition: background-color 0.18s ease, box-shadow 0.18s ease;
}

.btn-close-shift:hover:not(:disabled),
.btn-close-shift:focus-visible {
  background-color: #005b7d;
  border-color: #005b7d;
  color: #fff;
}

.btn-close-shift:active:not(:disabled) {
  background-color: #004a66;
  border-color: #004a66;
  color: #fff;
}

.btn-close-shift:disabled {
  background-color: #00729c;
  border-color: #00729c;
  color: #fff;
  opacity: 0.5;
}

.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
  padding: 1rem;
}

.modal-dialog-custom {
  background: white;
  border-radius: 0.75rem;
}
</style>
