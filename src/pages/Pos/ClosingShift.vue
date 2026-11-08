<template>
  <div class="closing-shift-page p-3">
    <!-- Header -->
    <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 bg-white p-3 rounded shadow-sm gap-2">
      <div>
        <h4 class="m-0 fw-bold text-dark">
          🏁 Closing Shift Kasir (Playground &amp; Cafe)
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
          <span>{{ loading ? 'Memuat...' : '🔄 Refresh' }}</span>
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

    <!-- If No Active Shift: Form Buka Shift Baru -->
    <div v-else-if="!currentShiftData?.shift" class="card shadow-sm border-0 p-4 p-md-5 text-center">
      <div style="font-size: 3rem;">🔒</div>
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
          <div class="card-header bg-dark text-white py-3 d-flex justify-content-between align-items-center">
            <h6 class="m-0 fw-bold">📊 Rekap Penjualan Shift #{{ currentShiftData.shift.id }}</h6>
            <span class="badge bg-success">Status: AKTIF</span>
          </div>
          <div class="card-body p-4">
            <div class="row g-3 mb-4">
              <div class="col-6">
                <div class="p-3 rounded border" style="background-color: #f0faff; border-color: #b8ebff !important;">
                  <small class="text-uppercase fw-bold text-muted">🎡 Omset Playground</small>
                  <h4 class="fw-bold m-0 mt-1" style="color: #00729c;">
                    {{ rupiah(currentShiftData.stats.playground_sales) }}
                  </h4>
                </div>
              </div>
              <div class="col-6">
                <div class="p-3 rounded border" style="background-color: #fff2fa; border-color: #ffcceb !important;">
                  <small class="text-uppercase fw-bold text-muted">☕ Omset Cafe &amp; F&amp;B</small>
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
            <h6 class="fw-bold text-dark mb-3">Rincian Berdasarkan Metode Pembayaran:</h6>
            <ul class="list-group list-group-flush border rounded">
              <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>💵 Penerimaan Tunai (Cash)</span>
                <strong class="fw-bold">{{ rupiah(currentShiftData.stats.cash_total) }}</strong>
              </li>
              <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>📱 Pembayaran QRIS</span>
                <strong class="fw-bold">{{ rupiah(currentShiftData.stats.qris_total) }}</strong>
              </li>
              <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>💳 Kartu EDC / Debit</span>
                <strong class="fw-bold">{{ rupiah(currentShiftData.stats.debit_total) }}</strong>
              </li>
              <li class="list-group-item d-flex justify-content-between align-items-center">
                <span>⭐ Penggunaan Saldo Member</span>
                <strong class="fw-bold">{{ rupiah(currentShiftData.stats.member_balance_total) }}</strong>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Right: Cash Drawer Reconciliation & Submit Closing -->
      <div class="col-lg-5">
        <div class="card shadow-sm border-0">
          <div class="card-header bg-danger text-white py-3">
            <h6 class="m-0 fw-bold">💰 Rekonsiliasi Kas Laci &amp; Closing</h6>
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
                {{ cashVariance === 0 ? '✓ Kas Pas (Sempurna)' : cashVariance > 0 ? '⚠️ Uang Lebih di Laci' : '⚠️ Uang Kurang / Minus di Laci' }}
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

            <!-- Button Tutup Shift (Full Action: Disable jika tidak valid) -->
            <button
              class="btn btn-danger btn-lg w-100 py-3 fw-bold shadow-sm"
              :disabled="isClosingDisabled"
              @click="submitClosing"
            >
              <span v-if="submittingClose" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
              <span>{{ submittingClose ? 'Memproses Closing...' : '🏁 TUTUP SHIFT & REKONSILIASI' }}</span>
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
        <pre class="bg-light p-3 rounded font-monospace small mb-3" style="max-height: 320px; overflow-y: auto;">{{ reportText }}</pre>
        <div class="d-flex justify-content-end gap-2">
          <button class="btn btn-outline-secondary" type="button" @click="printReport">
            🖨️ Cetak Ringkasan
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
  // Jika ada selisih kas, catatan kasir WAJIB diisi
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
  try {
    const res = await api('/shifts/close', {
      method: 'POST',
      body: {
        actual_closing_cash: Number(actualClosingCash.value),
        notes: closingNotes.value.trim()
      }
    })

    if (res.success) {
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

function finishClosingModal() {
  closingReportModal.value = false
  fetchCurrentShift()
}

function printReport() {
  window.print()
}

onMounted(() => {
  fetchCurrentShift()
})
</script>

<style scoped>
.closing-shift-page {
  min-height: calc(100vh - 120px);
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
