<template>
  <div class="pt-visitors-page">
    <!-- Top Page Bar -->
    <div class="pt-page-bar d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
      <div>
        <h5 class="mb-0 fw-semibold text-dark">Monitoring Pengunjung</h5>
        <div class="text-muted" style="font-size: 12.5px;">
          Pemantauan durasi bermain, status overtime, dan kuota re-entry pengunjung aktif
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
          @click="fetchVisitors"
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

    <!-- Clean Summary Cards -->
    <div class="row g-3 mb-3">
      <div class="col-md-4">
        <div class="pt-stat-card">
          <div class="text-muted fw-medium" style="font-size: 12px;">Total Pengunjung Aktif</div>
          <div class="d-flex align-items-baseline justify-content-between mt-1">
            <span class="pt-stat-val text-dark">{{ visitors.length }}</span>
            <span class="pt-tag">Di Dalam Area</span>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="pt-stat-card">
          <div class="text-muted fw-medium" style="font-size: 12px;">Durasi Normal</div>
          <div class="d-flex align-items-baseline justify-content-between mt-1">
            <span class="pt-stat-val text-success">{{ safeVisitors.length }}</span>
            <span class="pt-status-badge allowed">Waktu Aman</span>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="pt-stat-card">
          <div class="text-muted fw-medium" style="font-size: 12px;">Melewati Batas Waktu (Overtime)</div>
          <div class="d-flex align-items-baseline justify-content-between mt-1">
            <span class="pt-stat-val text-danger">{{ overtimeVisitors.length }}</span>
            <span class="pt-status-badge denied">Perlu Penyelesaian</span>
          </div>
        </div>
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

    <!-- Active Visitors Table -->
    <div class="pt-panel">
      <div class="pt-panel-header d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span class="fw-semibold text-dark">Daftar Tiket &amp; Durasi Bermain</span>
        </div>
        <span class="pt-tag">Pembaruan otomatis 5 detik</span>
      </div>

      <div class="table-responsive">
        <table class="table pt-table align-middle mb-0">
          <thead>
            <tr>
              <th style="width: 50px;">No</th>
              <th>Kode Tiket</th>
              <th>Nama Pengunjung</th>
              <th>Paket Bermain</th>
              <th>Jam Masuk</th>
              <th>Batas Waktu</th>
              <th>Status Durasi</th>
              <th>Re-entry</th>
              <th class="text-end" style="min-width: 170px;">Tindakan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading && visitors.length === 0">
              <td colspan="9" class="text-center py-5 text-muted">
                Memuat data pengunjung...
              </td>
            </tr>
            <tr v-else-if="visitors.length === 0">
              <td colspan="9" class="text-center py-5 text-muted">
                Belum ada pengunjung aktif di dalam area saat ini.
              </td>
            </tr>
            <tr v-for="(v, idx) in visitors" :key="v.id">
              <td class="text-muted">{{ idx + 1 }}</td>
              <td>
                <div class="font-monospace fw-semibold text-dark">{{ v.ticket_code }}</div>
                <div v-if="v.rfid_uid" class="text-muted font-monospace" style="font-size: 11px;">RFID: {{ v.rfid_uid }}</div>
              </td>
              <td class="fw-medium text-dark">{{ v.visitor_name }}</td>
              <td>
                <span class="pt-tag">{{ v.package_name }}</span>
              </td>
              <td class="font-monospace text-muted">{{ v.start_time ? fmtTime(v.start_time) : 'Belum Scan' }}</td>
              <td class="font-monospace text-muted">{{ v.expiry_time ? fmtTime(v.expiry_time) : '-' }}</td>
              <td>
                <span
                  class="pt-status-badge"
                  :class="v.is_overtime ? 'denied' : v.remaining_minutes <= 15 ? 'warning' : 'allowed'"
                >
                  {{ v.is_overtime ? `Overtime ${v.calculated_overtime_minutes} mnt` : `Sisa ${v.remaining_minutes} mnt` }}
                </span>
              </td>
              <td>
                <span class="pt-tag font-monospace">{{ v.reentry_count }}/{{ v.max_reentry }}</span>
              </td>
              <td class="text-end">
                <button
                  v-if="v.is_overtime && v.overtime_paid !== 1"
                  type="button"
                  class="pt-btn-danger"
                  @click="openOvertimeModal(v)"
                >
                  Bayar Overtime ({{ rupiah(v.overtime_fee || 15000) }})
                </button>
                <span v-else-if="v.overtime_paid === 1" class="pt-status-badge allowed">
                  Overtime Lunas
                </span>
                <span v-else class="text-muted" style="font-size: 12px;">
                  Aktif
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Pembayaran Overtime -->
    <div v-if="selectedTicket" class="pt-modal-backdrop">
      <div class="pt-panel" style="max-width: 460px; width: 100%;">
        <div class="pt-panel-header d-flex justify-content-between align-items-center">
          <span class="fw-semibold text-dark">Penyelesaian Biaya Overtime</span>
          <button type="button" class="btn-close btn-sm" :disabled="submittingPayment" @click="closeOvertimeModal" />
        </div>

        <div class="p-3">
          <div class="p-3 rounded-2 bg-light border mb-3" style="font-size: 13px;">
            <div class="d-flex justify-content-between mb-1">
              <span class="text-muted">Nama Pengunjung</span>
              <strong class="text-dark">{{ selectedTicket.visitor_name }}</strong>
            </div>
            <div class="d-flex justify-content-between mb-1">
              <span class="text-muted">Kode Tiket</span>
              <span class="font-monospace fw-semibold">{{ selectedTicket.ticket_code }}</span>
            </div>
            <div class="d-flex justify-content-between mb-2">
              <span class="text-muted">Durasi Overtime</span>
              <span class="pt-status-badge denied">{{ selectedTicket.calculated_overtime_minutes }} Menit</span>
            </div>
            <div class="d-flex justify-content-between border-top pt-2 align-items-center">
              <span class="fw-semibold text-dark">Total Tagihan Overtime</span>
              <span class="fw-bold text-danger" style="font-size: 16px;">{{ rupiah(overtimeAmount) }}</span>
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label small fw-semibold text-secondary mb-1">Metode Pembayaran</label>
            <div class="d-grid gap-2" style="grid-template-columns: repeat(3, 1fr);">
              <button
                type="button"
                class="pt-seg-btn"
                :class="{ active: payMethod === 'cash' }"
                @click="payMethod = 'cash'"
              >
                Tunai
              </button>
              <button
                type="button"
                class="pt-seg-btn"
                :class="{ active: payMethod === 'qris' }"
                @click="payMethod = 'qris'"
              >
                QRIS
              </button>
              <button
                type="button"
                class="pt-seg-btn"
                :class="{ active: payMethod === 'card_edc' }"
                @click="payMethod = 'card_edc'"
              >
                Kartu EDC
              </button>
            </div>
          </div>

          <div v-if="payMethod === 'cash'" class="mb-3">
            <label class="form-label small fw-semibold text-secondary mb-1">Nominal Tunai Diterima (Rp)</label>
            <input
              v-model.number="cashReceived"
              type="number"
              min="0"
              step="5000"
              class="form-control fw-semibold text-end mb-2"
              placeholder="0"
            >
            <div class="d-flex gap-1 flex-wrap mb-2">
              <button type="button" class="pt-btn-outline" style="padding: 4px 10px; font-size: 12px;" @click="cashReceived = overtimeAmount">Uang Pas</button>
              <button type="button" class="pt-btn-outline" style="padding: 4px 10px; font-size: 12px;" @click="cashReceived = (cashReceived || 0) + 10000">+10.000</button>
              <button type="button" class="pt-btn-outline" style="padding: 4px 10px; font-size: 12px;" @click="cashReceived = (cashReceived || 0) + 20000">+20.000</button>
              <button type="button" class="pt-btn-outline" style="padding: 4px 10px; font-size: 12px;" @click="cashReceived = (cashReceived || 0) + 50000">+50.000</button>
            </div>

            <div
              v-if="cashReceived > 0"
              class="p-2 rounded-2 d-flex justify-content-between"
              style="font-size: 12.5px;"
              :class="cashReceived >= overtimeAmount ? 'pt-alert-success' : 'pt-alert-danger'"
            >
              <span>{{ cashReceived >= overtimeAmount ? 'Kembalian' : 'Kekurangan' }}</span>
              <strong>{{ rupiah(Math.abs(cashReceived - overtimeAmount)) }}</strong>
            </div>
          </div>

          <div class="d-flex gap-2 justify-content-end">
            <button
              type="button"
              class="pt-btn-outline"
              :disabled="submittingPayment"
              @click="closeOvertimeModal"
            >
              Batal
            </button>
            <button
              type="button"
              class="pt-btn-primary"
              :disabled="isPayDisabled"
              @click="submitOvertimePayment"
            >
              {{ submittingPayment ? 'Memproses...' : 'Konfirmasi Pembayaran' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { api } from '@/utils/posApi'
import { rupiah, fmtTime } from '@/utils/format'

const visitors = ref([])
const loading = ref(false)
const submittingPayment = ref(false)
const feedbackMsg = ref('')
const feedbackType = ref('success')

const selectedTicket = ref(null)
const payMethod = ref('cash')
const cashReceived = ref(0)

let pollTimer = null

async function fetchVisitors() {
  loading.value = true
  try {
    const res = await api('/gate/active-tickets')
    if (res.success && Array.isArray(res.data)) {
      visitors.value = res.data
    }
  } catch (err) {
    console.error('Fetch active visitors error:', err)
  } finally {
    loading.value = false
  }
}

const overtimeVisitors = computed(() => visitors.value.filter(v => v.is_overtime))
const safeVisitors = computed(() => visitors.value.filter(v => !v.is_overtime))

const overtimeAmount = computed(() => {
  return Number(selectedTicket.value?.overtime_fee) || 15000
})

const isPayDisabled = computed(() => {
  if (submittingPayment.value) return true
  if (!selectedTicket.value) return true
  if (payMethod.value === 'cash' && Number(cashReceived.value) < overtimeAmount.value) {
    return true
  }
  return false
})

function openOvertimeModal(ticket) {
  selectedTicket.value = ticket
  payMethod.value = 'cash'
  cashReceived.value = Number(ticket.overtime_fee) || 15000
}

function closeOvertimeModal() {
  if (submittingPayment.value) return
  selectedTicket.value = null
  cashReceived.value = 0
}

async function submitOvertimePayment() {
  if (isPayDisabled.value) return
  submittingPayment.value = true
  try {
    const res = await api('/gate/pay-overtime', {
      method: 'POST',
      body: {
        ticket_id: selectedTicket.value.id,
        payment_method: payMethod.value,
        cash_received: payMethod.value === 'cash' ? Number(cashReceived.value) : overtimeAmount.value
      }
    })

    if (res.success) {
      feedbackType.value = 'success'
      feedbackMsg.value = `Pembayaran overtime sebesar ${rupiah(overtimeAmount.value)} untuk ${selectedTicket.value.visitor_name} berhasil dicatat.`
      closeOvertimeModal()
      await fetchVisitors()
    } else {
      feedbackType.value = 'danger'
      feedbackMsg.value = res.message || 'Gagal memproses pembayaran overtime.'
    }
  } catch (err) {
    feedbackType.value = 'danger'
    feedbackMsg.value = err.message || 'Terjadi kesalahan saat memproses pembayaran.'
  } finally {
    submittingPayment.value = false
  }
}

onMounted(() => {
  fetchVisitors()
  pollTimer = setInterval(fetchVisitors, 5000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped>
.pt-visitors-page {
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
  font-size: 24px;
  font-weight: 700;
  line-height: 1.1;
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

.pt-btn-danger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  font-size: 12px;
  font-weight: 600;
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.pt-btn-danger:hover {
  background: #fee2e2;
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

.pt-status-badge.warning {
  background: #fef3c7;
  color: #b45309;
}

.pt-status-badge.denied {
  background: #fee2e2;
  color: #b91c1c;
}

.pt-seg-btn {
  padding: 7px 10px;
  font-size: 12.5px;
  font-weight: 600;
  color: #475569;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
}

.pt-seg-btn.active {
  background: #0284c7;
  border-color: #0284c7;
  color: #ffffff;
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
