<template>
  <div class="live-visitors-page p-3">
    <!-- Header -->
    <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 bg-white p-3 rounded shadow-sm gap-2">
      <div>
        <h4 class="m-0 fw-bold text-dark">
          👥 Monitoring Pengunjung Aktif Playground
        </h4>
        <small class="text-muted">Pantau sisa durasi bermain anak, status overtime, dan kuota re-entry secara real-time.</small>
      </div>
      <div class="d-flex gap-2">
        <router-link to="/app/pos" class="btn btn-primary fw-semibold">
          🛒 Ke Kasir POS
        </router-link>
        <button
          class="btn btn-outline-secondary d-flex align-items-center gap-1"
          :disabled="loading"
          @click="fetchVisitors"
        >
          <span v-if="loading" class="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
          <span>{{ loading ? 'Memuat...' : '🔄 Refresh' }}</span>
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="row g-3 mb-3">
      <div class="col-md-4">
        <div class="card border-0 shadow-sm text-white p-3" style="background: linear-gradient(135deg, #5cd2ff 0%, #00729c 100%);">
          <small class="text-uppercase text-white-50 fw-bold">Total Anak di Dalam Wahana</small>
          <h2 class="fw-bold m-0 mt-1">{{ visitors.length }} Anak</h2>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card border-0 shadow-sm text-white p-3" style="background: linear-gradient(135deg, #ff5cbc 0%, #99005b 100%);">
          <small class="text-uppercase text-white-50 fw-bold">Pengunjung Overtime</small>
          <h2 class="fw-bold m-0 mt-1">{{ overtimeVisitors.length }} Anak</h2>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card border-0 shadow-sm text-white p-3" style="background: linear-gradient(135deg, #25d366 0%, #0d9488 100%);">
          <small class="text-uppercase text-white-50 fw-bold">Waktu Bermain Masih Aman</small>
          <h2 class="fw-bold m-0 mt-1">{{ safeVisitors.length }} Anak</h2>
        </div>
      </div>
    </div>

    <!-- Alert notifikasi -->
    <div v-if="feedbackMsg" class="alert alert-dismissible mb-3" :class="'alert-' + feedbackType" role="alert">
      <span>{{ feedbackMsg }}</span>
      <button type="button" class="btn-close" aria-label="Close" @click="feedbackMsg = ''" />
    </div>

    <!-- Visitors Table -->
    <div class="card shadow-sm border-0">
      <div class="card-header bg-dark text-white py-3 d-flex justify-content-between align-items-center">
        <h6 class="m-0 fw-bold">Daftar Tiket & Durasi Bermain</h6>
        <small class="text-white-50">Auto-refresh setiap 5 detik</small>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover table-striped align-middle m-0">
            <thead class="table-light">
              <tr>
                <th style="width: 50px;">No</th>
                <th>Kode Tiket</th>
                <th>Nama Anak</th>
                <th>Paket Bermain</th>
                <th>Jam Masuk (IN)</th>
                <th>Batas Waktu (+10 Mnt)</th>
                <th>Status Waktu</th>
                <th>Re-entry</th>
                <th class="text-end" style="min-width: 180px;">Aksi Kasir</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading && visitors.length === 0">
                <td colspan="9" class="text-center py-5 text-muted">
                  <div class="spinner-border text-primary me-2" role="status" />
                  <span>Memuat data pengunjung...</span>
                </td>
              </tr>
              <tr v-else-if="visitors.length === 0">
                <td colspan="9" class="text-center py-5 text-muted">
                  Belum ada pengunjung yang aktif di dalam playground saat ini.
                </td>
              </tr>
              <tr v-for="(v, idx) in visitors" :key="v.id">
                <td>{{ idx + 1 }}</td>
                <td>
                  <strong class="text-dark">{{ v.ticket_code }}</strong><br />
                  <small class="text-muted font-monospace">RFID: {{ v.rfid_uid || '-' }}</small>
                </td>
                <td class="fw-bold">{{ v.visitor_name }}</td>
                <td>
                  <span class="badge bg-primary">{{ v.package_name }}</span>
                </td>
                <td>{{ v.start_time ? fmtTime(v.start_time) : 'Belum Scan' }}</td>
                <td>{{ v.expiry_time ? fmtTime(v.expiry_time) : '-' }}</td>
                <td>
                  <span
                    class="badge p-2"
                    :class="v.is_overtime ? 'bg-danger' : v.remaining_minutes <= 15 ? 'bg-warning text-dark' : 'bg-success'"
                  >
                    {{ v.is_overtime ? `Overtime ${v.calculated_overtime_minutes} mnt` : `Sisa ${v.remaining_minutes} mnt` }}
                  </span>
                </td>
                <td>
                  <span class="badge bg-secondary">
                    {{ v.reentry_count }} / {{ v.max_reentry }}x
                  </span>
                </td>
                <td class="text-end">
                  <button
                    v-if="v.is_overtime && v.overtime_paid !== 1"
                    class="btn btn-sm btn-danger fw-bold shadow-sm"
                    @click="openOvertimeModal(v)"
                  >
                    💰 Bayar Overtime ({{ rupiah(v.overtime_fee || 15000) }})
                  </button>
                  <span v-else-if="v.overtime_paid === 1" class="badge bg-success p-2">
                    ✓ Overtime Lunas (15 mnt keluar)
                  </span>
                  <span v-else class="text-muted small">
                    ✓ Waktu Aman
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Pembayaran Overtime -->
    <div v-if="selectedTicket" class="modal-backdrop-custom">
      <div class="modal-dialog-custom card p-4 shadow-lg border-0" style="max-width: 480px; width: 100%;">
        <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
          <h5 class="fw-bold m-0 text-danger">💳 Bayar Denda Overtime</h5>
          <button type="button" class="btn-close" :disabled="submittingPayment" @click="closeOvertimeModal" />
        </div>

        <div class="bg-light p-3 rounded mb-3">
          <div class="d-flex justify-content-between mb-1">
            <span class="text-muted">Nama Anak:</span>
            <strong class="text-dark">{{ selectedTicket.visitor_name }}</strong>
          </div>
          <div class="d-flex justify-content-between mb-1">
            <span class="text-muted">Kode Tiket:</span>
            <span class="font-monospace fw-bold">{{ selectedTicket.ticket_code }}</span>
          </div>
          <div class="d-flex justify-content-between mb-1">
            <span class="text-muted">Waktu Overtime:</span>
            <span class="badge bg-danger">{{ selectedTicket.calculated_overtime_minutes }} Menit</span>
          </div>
          <div class="d-flex justify-content-between border-top pt-2 mt-2 align-items-center">
            <span class="fw-bold">Total Denda:</span>
            <h4 class="m-0 fw-bold text-danger">{{ rupiah(overtimeAmount) }}</h4>
          </div>
        </div>

        <!-- Pilihan Metode Pembayaran -->
        <div class="mb-3">
          <label class="form-label small fw-bold text-muted">Metode Pembayaran:</label>
          <div class="btn-group w-100" role="group">
            <button
              type="button"
              class="btn btn-sm"
              :class="payMethod === 'cash' ? 'btn-primary fw-bold' : 'btn-outline-secondary'"
              @click="payMethod = 'cash'"
            >
              💵 Tunai
            </button>
            <button
              type="button"
              class="btn btn-sm"
              :class="payMethod === 'qris' ? 'btn-primary fw-bold' : 'btn-outline-secondary'"
              @click="payMethod = 'qris'"
            >
              📱 QRIS
            </button>
            <button
              type="button"
              class="btn btn-sm"
              :class="payMethod === 'card_edc' ? 'btn-primary fw-bold' : 'btn-outline-secondary'"
              @click="payMethod = 'card_edc'"
            >
              💳 Kartu EDC
            </button>
          </div>
        </div>

        <!-- Input Tunai -->
        <div v-if="payMethod === 'cash'" class="mb-3">
          <label class="form-label small fw-bold text-muted">Uang Tunai Diterima:</label>
          <div class="input-group mb-2">
            <span class="input-group-text">Rp</span>
            <input
              type="number"
              v-model.number="cashReceived"
              min="0"
              step="5000"
              class="form-control form-control-lg fw-bold text-end"
              placeholder="0"
            />
          </div>
          <div class="d-flex gap-1 flex-wrap mb-2">
            <button
              type="button"
              class="btn btn-sm btn-outline-primary"
              @click="cashReceived = overtimeAmount"
            >
              Uang Pas
            </button>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              @click="cashReceived = (cashReceived || 0) + 10000"
            >
              +10rb
            </button>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              @click="cashReceived = (cashReceived || 0) + 20000"
            >
              +20rb
            </button>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              @click="cashReceived = (cashReceived || 0) + 50000"
            >
              +50rb
            </button>
          </div>

          <div
            v-if="cashReceived > 0"
            class="p-2 rounded small"
            :class="cashReceived >= overtimeAmount ? 'bg-success-subtle text-success border border-success' : 'bg-danger-subtle text-danger border border-danger'"
          >
            <div class="d-flex justify-content-between">
              <span>{{ cashReceived >= overtimeAmount ? 'Kembalian:' : 'Uang Kurang:' }}</span>
              <strong class="fw-bold">{{ rupiah(Math.abs(cashReceived - overtimeAmount)) }}</strong>
            </div>
          </div>
        </div>

        <!-- Tombol Aksi (Full Action: Disable saat uang kurang / loading) -->
        <div class="d-flex gap-2 justify-content-end mt-2">
          <button
            type="button"
            class="btn btn-outline-secondary"
            :disabled="submittingPayment"
            @click="closeOvertimeModal"
          >
            Batal
          </button>
          <button
            type="button"
            class="btn btn-danger fw-bold px-4"
            :disabled="isPayDisabled"
            @click="submitOvertimePayment"
          >
            <span v-if="submittingPayment" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
            <span>{{ submittingPayment ? 'Memproses...' : '✓ Bayar Sekarang' }}</span>
          </button>
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
      feedbackMsg.value = `Pembayaran overtime Rp ${overtimeAmount.value.toLocaleString('id-ID')} untuk ${selectedTicket.value.visitor_name} berhasil! Grace period 15 menit diberikan untuk keluar.`
      closeOvertimeModal()
      await fetchVisitors()
    } else {
      feedbackType.value = 'danger'
      feedbackMsg.value = res.message || 'Gagal memproses pembayaran overtime.'
    }
  } catch (err) {
    feedbackType.value = 'danger'
    feedbackMsg.value = err.message || 'Terjadi kesalahan sistem saat pembayaran overtime.'
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
.live-visitors-page {
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
