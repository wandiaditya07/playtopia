<template>
  <div class="pt-closing-page">
    <!-- Top Page Bar -->
    <div class="pt-page-bar d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
      <div>
        <h5 class="mb-0 fw-semibold text-dark">Shift &amp; Kas Laci</h5>
        <div class="text-muted" style="font-size: 12.5px;">
          Rekonsiliasi kas laci, rincian penerimaan per metode pembayaran, dan penutupan shift kasir
        </div>
      </div>

      <div class="d-flex align-items-center gap-2">
        <router-link to="/app/pos" class="pt-btn-outline text-decoration-none">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          <span>Kasir POS</span>
        </router-link>

        <button
          type="button"
          class="pt-btn-primary"
          :disabled="loading"
          @click="fetchCurrentShift"
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
      v-if="feedbackMsg"
      class="pt-alert mb-3 d-flex align-items-center justify-content-between"
      :class="feedbackType === 'danger' ? 'pt-alert-danger' : 'pt-alert-success'"
    >
      <span>{{ feedbackMsg }}</span>
      <button type="button" class="btn-close btn-sm" @click="feedbackMsg = ''" />
    </div>

    <!-- Loading State -->
    <div v-if="loading && !currentShiftData" class="pt-panel p-5 text-center text-muted">
      Memuat data shift kasir...
    </div>

    <!-- No Active Shift -->
    <div v-else-if="!currentShiftData?.shift" class="pt-panel p-5 text-center">
      <div class="mx-auto mb-3 d-inline-flex align-items-center justify-content-center rounded-circle bg-light border" style="width: 48px; height: 48px; color: #0284c7;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h5 class="fw-semibold text-dark">Tidak Ada Shift Aktif</h5>
      <p class="text-muted mb-4" style="font-size: 13px;">
        Masukkan nominal modal awal kas laci untuk membuka shift kasir baru.
      </p>

      <div class="col-md-5 col-lg-4 mx-auto text-start">
        <div class="mb-3">
          <label class="form-label small fw-semibold text-secondary">Modal Awal Kas Laci (Rp)</label>
          <input
            v-model.number="newOpeningCash"
            type="number"
            min="0"
            step="50000"
            class="form-control fw-semibold"
            placeholder="0"
          >
        </div>

        <button
          type="button"
          class="pt-btn-primary w-100 justify-content-center py-2"
          :disabled="isOpenShiftDisabled"
          @click="openShift"
        >
          {{ submittingOpen ? 'Membuka Shift...' : 'Buka Shift Baru' }}
        </button>
      </div>
    </div>

    <!-- Active Shift Data -->
    <div v-else class="row g-3">
      <!-- Left: Revenue Breakdown -->
      <div class="col-lg-7">
        <div class="pt-panel h-100">
          <div class="pt-panel-header d-flex justify-content-between align-items-center">
            <span class="fw-semibold text-dark">Ringkasan Penjualan Shift #{{ currentShiftData.shift.id }}</span>
            <span class="pt-status-badge allowed">Shift Aktif</span>
          </div>

          <div class="p-3">
            <div class="row g-3 mb-3">
              <div class="col-sm-4">
                <div class="p-3 rounded-2 bg-light border">
                  <div class="text-muted" style="font-size: 12px;">Total Pendapatan</div>
                  <div class="fw-bold text-dark mt-1" style="font-size: 18px;">
                    {{ rupiah(currentShiftData.stats.total_revenue) }}
                  </div>
                  <div class="text-muted mt-1" style="font-size: 11.5px;">
                    {{ currentShiftData.stats.total_transactions }} transaksi
                  </div>
                </div>
              </div>

              <div class="col-sm-4">
                <div class="p-3 rounded-2 bg-light border">
                  <div class="text-muted" style="font-size: 12px;">Unit Playground</div>
                  <div class="fw-bold text-dark mt-1" style="font-size: 18px;">
                    {{ rupiah(currentShiftData.stats.playground_sales) }}
                  </div>
                  <div class="text-muted mt-1" style="font-size: 11.5px;">Tiket &amp; Durasi</div>
                </div>
              </div>

              <div class="col-sm-4">
                <div class="p-3 rounded-2 bg-light border">
                  <div class="text-muted" style="font-size: 12px;">Unit Cafe &amp; F&amp;B</div>
                  <div class="fw-bold text-dark mt-1" style="font-size: 18px;">
                    {{ rupiah(currentShiftData.stats.cafe_sales) }}
                  </div>
                  <div class="text-muted mt-1" style="font-size: 11.5px;">Makanan &amp; Minuman</div>
                </div>
              </div>
            </div>

            <div class="fw-semibold text-dark mb-2" style="font-size: 13px;">Rincian Metode Pembayaran</div>
            <div class="border rounded-2 overflow-hidden">
              <div class="d-flex justify-content-between align-items-center px-3 py-2 border-bottom" style="font-size: 13px;">
                <span class="text-secondary">Penerimaan Tunai (Cash)</span>
                <strong class="text-dark">{{ rupiah(currentShiftData.stats.cash_total) }}</strong>
              </div>
              <div class="d-flex justify-content-between align-items-center px-3 py-2 border-bottom" style="font-size: 13px;">
                <span class="text-secondary">Pembayaran QRIS</span>
                <strong class="text-dark">{{ rupiah(currentShiftData.stats.qris_total) }}</strong>
              </div>
              <div class="d-flex justify-content-between align-items-center px-3 py-2 border-bottom" style="font-size: 13px;">
                <span class="text-secondary">Kartu EDC / Debit</span>
                <strong class="text-dark">{{ rupiah(currentShiftData.stats.debit_total) }}</strong>
              </div>
              <div class="d-flex justify-content-between align-items-center px-3 py-2" style="font-size: 13px;">
                <span class="text-secondary">Saldo Kartu Member</span>
                <strong class="text-dark">{{ rupiah(currentShiftData.stats.member_balance_total) }}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Cash Drawer Reconciliation -->
      <div class="col-lg-5">
        <div class="pt-panel h-100">
          <div class="pt-panel-header d-flex justify-content-between align-items-center">
            <span class="fw-semibold text-dark">Rekonsiliasi Kas Laci</span>
            <span class="pt-tag">Penutupan Shift</span>
          </div>

          <div class="p-3">
            <div class="p-3 bg-light rounded-2 border mb-3" style="font-size: 13px;">
              <div class="d-flex justify-content-between mb-1">
                <span class="text-muted">Modal Awal Kas</span>
                <strong class="text-dark">{{ rupiah(currentShiftData.shift.opening_cash) }}</strong>
              </div>
              <div class="d-flex justify-content-between mb-2">
                <span class="text-muted">Penjualan Tunai</span>
                <strong class="text-success">+ {{ rupiah(currentShiftData.stats.cash_total) }}</strong>
              </div>
              <div class="d-flex justify-content-between border-top pt-2 align-items-center">
                <span class="fw-semibold text-dark">Ekspektasi Kas di Laci</span>
                <strong class="text-dark" style="font-size: 15px;">
                  {{ rupiah(currentShiftData.stats.expected_cash_drawer) }}
                </strong>
              </div>
            </div>

            <div class="mb-3">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <label class="form-label small fw-semibold text-secondary mb-0">Jumlah Kas Fisik Aktual (Rp)</label>
                <button
                  type="button"
                  class="btn btn-link btn-sm p-0 text-decoration-none"
                  style="font-size: 12px;"
                  @click="actualClosingCash = currentShiftData.stats.expected_cash_drawer"
                >
                  Samakan Ekspektasi
                </button>
              </div>
              <input
                v-model.number="actualClosingCash"
                type="number"
                min="0"
                step="1000"
                class="form-control fw-semibold text-end"
                placeholder="0"
              >
            </div>

            <div
              class="p-2 px-3 rounded-2 mb-3 d-flex justify-content-between align-items-center"
              style="font-size: 13px;"
              :class="cashVariance === 0 ? 'pt-alert-success' : 'pt-alert-danger'"
            >
              <span>Selisih Kas Fisik</span>
              <strong>{{ (cashVariance >= 0 ? '+' : '') + rupiah(cashVariance) }}</strong>
            </div>

            <div class="mb-3">
              <label class="form-label small fw-semibold text-secondary mb-1">
                Catatan Penutupan Shift {{ cashVariance !== 0 ? '(Wajib diisi jika selisih)' : '(Opsional)' }}
              </label>
              <textarea
                v-model="closingNotes"
                class="form-control"
                rows="2"
                style="font-size: 13px;"
                placeholder="Tambahkan keterangan serah terima shift..."
              />
            </div>

            <button
              type="button"
              class="pt-btn-primary w-100 justify-content-center py-2"
              :disabled="isClosingDisabled"
              @click="submitClosing"
            >
              {{ submittingClose ? 'Memproses...' : 'Tutup Shift & Simpan Rekonsiliasi' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Ringkasan Closing -->
    <div v-if="closingReportModal" class="pt-modal-backdrop">
      <div class="pt-panel" style="max-width: 520px; width: 100%;">
        <div class="pt-panel-header d-flex justify-content-between align-items-center">
          <span class="fw-semibold text-dark">Ringkasan Penutupan Shift</span>
          <button type="button" class="btn-close btn-sm" @click="finishClosingModal" />
        </div>
        <div class="p-3">
          <pre class="bg-light p-3 rounded-2 border font-monospace mb-3" style="font-size: 12px; max-height: 300px; overflow-y: auto;">{{ reportText }}</pre>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="pt-btn-outline" @click="printReport">Cetak</button>
            <button type="button" class="pt-btn-primary" @click="finishClosingModal">Selesai</button>
          </div>
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
      feedbackMsg.value = `Shift #${res.data?.id || ''} berhasil dibuka dengan modal awal ${rupiah(newOpeningCash.value)}.`
      await fetchCurrentShift()
    } else {
      feedbackType.value = 'danger'
      feedbackMsg.value = res.message || 'Gagal membuka shift.'
    }
  } catch (err) {
    feedbackType.value = 'danger'
    feedbackMsg.value = err.message || 'Terjadi kesalahan saat membuka shift.'
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
`RINGKASAN CLOSING SHIFT PLAYTOPIA POS
----------------------------------------------
Shift ID       : #${res.data?.shift?.id}
Waktu Tutup    : ${fmtDateTime(new Date())}
Total Omset    : ${rupiah(res.data?.stats?.total_revenue || 0)}
- Playground   : ${rupiah(res.data?.stats?.playground_sales || 0)}
- Cafe & F&B   : ${rupiah(res.data?.stats?.cafe_sales || 0)}

REKONSILIASI KAS LACI
Modal Awal     : ${rupiah(res.data?.shift?.opening_cash || 0)}
Penjualan Cash : +${rupiah(res.data?.stats?.cash_total || 0)}
Ekspektasi Kas : ${rupiah(res.data?.stats?.expected_cash_drawer || 0)}
Kas Fisik      : ${rupiah(actualClosingCash.value)}
Selisih Kas    : ${(cashVariance.value >= 0 ? '+' : '') + rupiah(cashVariance.value)}

Catatan Kasir  : ${closingNotes.value || '-'}`

      closingReportModal.value = true
      currentShiftData.value = null
      closingNotes.value = ''
    } else {
      feedbackType.value = 'danger'
      feedbackMsg.value = res.message || 'Gagal menutup shift.'
    }
  } catch (err) {
    feedbackType.value = 'danger'
    feedbackMsg.value = err.message || 'Terjadi kesalahan saat menutup shift.'
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

onMounted(fetchCurrentShift)
</script>

<style scoped>
.pt-closing-page {
  max-width: 1400px;
}

.pt-page-bar {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px 18px;
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
