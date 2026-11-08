<template>
  <div class="hardware-simulator-page p-3">
    <!-- Header -->
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 bg-white p-3 rounded-3 shadow-sm border">
      <div>
        <div class="d-flex align-items-center gap-2">
          <h4 class="mb-0 fw-bold text-dark">
            🎡 Simulator Hardware Turnstile &amp; Gate
          </h4>
          <span class="badge bg-warning text-dark fw-bold">SANDBOX HARDWARE</span>
        </div>
        <small class="text-muted">
          Simulasikan respon barrier tripod turnstile, reader QR/RFID, deteksi overtime, kontrol re-entry, dan notifikasi WhatsApp secara virtual tanpa alat fisik.
        </small>
      </div>
      <div class="d-flex gap-2">
        <router-link to="/app/pos" class="btn btn-outline-primary btn-sm fw-semibold">
          🛒 Ke Kasir POS
        </router-link>
        <button
          type="button"
          class="btn btn-primary btn-sm fw-semibold d-flex align-items-center gap-1"
          :disabled="refreshing"
          @click="refreshAll"
        >
          <span v-if="refreshing" class="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
          <span>{{ refreshing ? 'Memuat...' : '🔄 Refresh Data' }}</span>
        </button>
      </div>
    </div>

    <!-- Alert status -->
    <div
      v-if="notice"
      class="alert alert-dismissible mb-3 shadow-sm"
      :class="notice.type === 'error' ? 'alert-danger' : 'alert-success'"
      role="alert"
    >
      <strong>{{ notice.type === 'error' ? 'Perhatian:' : 'Berhasil:' }}</strong> {{ notice.text }}
      <button
        type="button"
        class="btn-close"
        aria-label="Tutup"
        @click="notice = null"
      />
    </div>

    <!-- Main Layout -->
    <div class="row g-3">
      <!-- Kolom Kiri: Visual Turnstile & Kontrol Scan -->
      <div class="col-lg-6">
        <div class="card h-100 shadow-sm border-0 sim-card">
          <div class="card-header bg-dark text-white py-3 d-flex justify-content-between align-items-center">
            <span class="fw-bold">🚧 Tripod Turnstile Barrier (Mock Controller)</span>
            <span class="badge bg-secondary font-monospace">POST /api/v1/gate/verify-access</span>
          </div>

          <div class="card-body p-3 p-md-4 d-flex flex-column gap-3 w-100">
            <!-- Gate Hardware Display (OLED Panel & LED Indicator) -->
            <div class="turnstile-display rounded-3 p-3 text-center position-relative" :class="gateDisplayClass">
              <!-- LED Signal Lights -->
              <div class="d-flex justify-content-center align-items-center gap-3 mb-2">
                <div class="led-light led-green" :class="{ 'led-active': gate.action === 'OPEN_GATE' }">
                  <span class="led-label">PASS</span>
                </div>
                <div class="led-light led-red" :class="{ 'led-active': gate.action === 'KEEP_LOCKED' }">
                  <span class="led-label">STOP</span>
                </div>
              </div>

              <!-- Main OLED Status -->
              <div class="oled-screen rounded p-3 mb-2">
                <div class="oled-status-title fw-bold">
                  {{ gate.action === 'OPEN_GATE' ? '🔓 GATE DIBUKA - SILAKAN MASUK' : gate.action === 'KEEP_LOCKED' ? '🔒 GATE TERKUNCI - AKSES DITOLAK' : '⚡ SIAP SCAN TIKET / RFID' }}
                </div>
                <div class="oled-message text-light mt-1 small">
                  {{ gate.message || 'Tempelkan barcode tiket kertas atau tap kartu RFID pada reader.' }}
                </div>
              </div>

              <!-- Buzzer & Relay Status -->
              <div class="d-flex justify-content-center gap-2 flex-wrap">
                <span class="badge bg-black text-warning font-monospace py-1 px-2 border border-secondary">
                  Buzzer: {{ gate.buzzer || 'Standby' }}
                </span>
                <span class="badge py-1 px-2" :class="gate.action === 'OPEN_GATE' ? 'bg-success' : 'bg-secondary'">
                  Relay Solenoid: {{ gate.action === 'OPEN_GATE' ? 'UNLOCKED (5s)' : 'LOCKED' }}
                </span>
              </div>
            </div>

            <!-- Controller Input Panel -->
            <div class="p-3 bg-light rounded-3 border w-100">
              <!-- Direction Selector -->
              <label class="form-label fw-bold text-dark small mb-2">1. Pilih Arah Gate (Direction):</label>
              <div class="btn-group w-100 mb-3" role="group">
                <button
                  type="button"
                  class="btn py-2 fw-bold"
                  :class="direction === 'IN' ? 'btn-success shadow-sm' : 'btn-outline-success'"
                  :disabled="busy"
                  @click="direction = 'IN'"
                >
                  🟢 Reader MASUK (IN)
                </button>
                <button
                  type="button"
                  class="btn py-2 fw-bold"
                  :class="direction === 'OUT' ? 'btn-danger shadow-sm' : 'btn-outline-danger'"
                  :disabled="busy"
                  @click="direction = 'OUT'"
                >
                  🔴 Reader KELUAR (OUT)
                </button>
              </div>

              <!-- Quick Ticket Selector -->
              <label class="form-label fw-bold text-dark small mb-1" for="ticket-select">
                2. Pilih Tiket Aktif Hari Ini (Otomatis Terisi):
              </label>
              <select
                id="ticket-select"
                v-model="selectedTicketId"
                class="form-select form-select-lg mb-3"
                :disabled="busy"
                @change="onSelectTicket"
              >
                <option value="">
                  {{ activeTickets.length ? '-- Pilih Tiket Pengunjung --' : 'Belum ada tiket aktif hari ini' }}
                </option>
                <option
                  v-for="t in activeTickets"
                  :key="t.id"
                  :value="t.id"
                >
                  {{ t.ticket_code }} - {{ t.visitor_name }} ({{ t.package_name }})
                </option>
              </select>

              <!-- Selected Ticket Preview Card (jika tiket dipilih) -->
              <div v-if="currentTicket" class="card p-2 mb-3 bg-white border border-primary-subtle shadow-xs">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <strong class="text-primary">{{ currentTicket.visitor_name }}</strong>
                  <span class="badge bg-primary">{{ currentTicket.package_name }}</span>
                </div>
                <div class="small text-muted d-flex justify-content-between">
                  <span>Re-entry: <strong>{{ currentTicket.reentry_count || 0 }}/{{ currentTicket.max_reentry || 2 }}x</strong></span>
                  <span>Status: <strong>{{ currentTicket.status || 'Active' }}</strong></span>
                </div>
              </div>

              <!-- Credential Input -->
              <div class="row g-2 mb-3">
                <div class="col-sm-4">
                  <label class="form-label small fw-bold text-muted" for="cred-type">Media Scanner:</label>
                  <select
                    id="cred-type"
                    v-model="credentialType"
                    class="form-select"
                    :disabled="busy"
                  >
                    <option value="QR">📱 Barcode / QR</option>
                    <option value="RFID">💳 RFID Mifare</option>
                  </select>
                </div>
                <div class="col-sm-8">
                  <label class="form-label small fw-bold text-muted" for="cred-value">Kode Tiket / UID RFID:</label>
                  <input
                    id="cred-value"
                    v-model.trim="credentialValue"
                    type="text"
                    class="form-control font-monospace fw-bold"
                    placeholder="Contoh: TCK-1107-XXXX atau UID"
                    :disabled="busy"
                    @keyup.enter="scan"
                  >
                </div>
              </div>

              <!-- Button Simulasikan Scan (Full Action: Disable jika input kosong / loading) -->
              <button
                type="button"
                class="btn btn-play-sky btn-lg w-100 py-3 fw-bold text-white shadow"
                :disabled="isScanDisabled"
                @click="scan"
              >
                <span v-if="busy" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                <span>{{ busy ? 'Memproses Turnstile...' : '⚡ SIMULASIKAN SCAN HARDWARE' }}</span>
              </button>

              <div v-if="scanBlockReason" class="text-danger small mt-2 fw-semibold text-center">
                ⚠️ {{ scanBlockReason }}
              </div>
            </div>

            <!-- Testing Sandbox Tools: Overtime & Re-entry -->
            <div class="p-3 rounded-3 border border-warning bg-warning-subtle w-100">
              <div class="fw-bold text-dark mb-1">
                🧪 Alat Uji Coba Aturan Bisnis Playground:
              </div>
              <p class="small text-muted mb-2">
                Gunakan tombol berikut untuk menguji validasi gate saat pengunjung bermain melewati batas waktu atau kuota re-entry:
              </p>
              <div class="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  class="btn btn-sm btn-outline-danger fw-bold"
                  :disabled="!canFastForward || busy"
                  @click="fastForward(75)"
                >
                  ⏩ Majukan Waktu +75 Menit (Uji Overtime)
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-info fw-bold"
                  :disabled="!canTestReentry || busy"
                  @click="testReentry"
                >
                  🔄 Uji Re-entry 3x (Uji Limit Kuota 2x)
                </button>
              </div>
              <small v-if="!canFastForward" class="text-muted d-block mt-1 fst-italic">
                * Pilih tiket berdurasi yang sudah pernah scan masuk untuk mengaktifkan tombol uji di atas.
              </small>
            </div>
          </div>
        </div>
      </div>

      <!-- Kolom Kanan: Riwayat Scan & Balon Chat WhatsApp -->
      <div class="col-lg-6 d-flex flex-column gap-3">
        <!-- Log Scan Card -->
        <div class="card shadow-sm border-0 sim-card">
          <div class="card-header bg-dark text-white py-3 d-flex justify-content-between align-items-center">
            <span class="fw-bold">📋 Riwayat Scan Turnstile (Hardware Access Logs)</span>
            <span class="badge bg-light text-dark">{{ logs.length }} Scan</span>
          </div>
          <div class="card-body p-0" style="max-height: 280px; overflow-y: auto;">
            <table class="table table-hover table-striped align-middle mb-0 small">
              <thead class="table-light sticky-top">
                <tr>
                  <th style="width: 85px;">Waktu</th>
                  <th style="width: 70px;">Arah</th>
                  <th>Kode Tiket</th>
                  <th style="width: 140px;" class="text-end">Hasil Akses</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="logs.length === 0">
                  <td colspan="4" class="text-center text-muted py-4">
                    Belum ada riwayat scan pada turnstile hari ini.
                  </td>
                </tr>
                <tr v-for="log in logs" :key="log.id">
                  <td class="font-monospace text-muted">{{ fmtTimeSeconds(log.scanned_at) }}</td>
                  <td>
                    <span
                      class="badge px-2 py-1"
                      :class="log.direction === 'in' || log.direction === 'IN' ? 'bg-success' : 'bg-danger'"
                    >
                      {{ String(log.direction).toUpperCase() }}
                    </span>
                  </td>
                  <td>
                    <strong class="text-dark">{{ log.ticket_code || log.credential_value }}</strong>
                  </td>
                  <td class="text-end">
                    <span
                      class="badge py-1 px-2"
                      :class="log.is_allowed ? 'bg-success' : 'bg-danger'"
                    >
                      {{ log.is_allowed ? 'DIIZINKAN' : 'DITOLAK' }}
                    </span>
                    <div v-if="log.deny_reason" class="text-danger small font-monospace mt-1" style="font-size: 11px;">
                      {{ log.deny_reason }}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- WhatsApp Outbox Card (Balon Chat Hijau Modern) -->
        <div class="card shadow-sm border-0 sim-card flex-grow-1">
          <div class="card-header py-3 d-flex justify-content-between align-items-center" style="background-color: #075e54; color: white;">
            <span class="fw-bold d-flex align-items-center gap-2">
              <span>💬</span> Notifikasi Terkirim (Sandbox WhatsApp Bot &amp; Email)
            </span>
            <span class="badge bg-light text-dark font-monospace">{{ outbox.length }} Pesan</span>
          </div>
          <div
            class="card-body p-3 whatsapp-bg"
            style="max-height: 380px; overflow-y: auto;"
          >
            <div
              v-if="outbox.length === 0"
              class="text-center text-muted py-5 bg-white rounded-3 shadow-xs"
            >
              Belum ada notifikasi yang terkirim dari transaksi kasir atau gate.
            </div>

            <!-- Balon Pesan WhatsApp Rapi -->
            <div
              v-for="msg in outbox"
              :key="msg.id"
              class="wa-bubble mb-3 p-3 rounded-3 shadow-sm bg-white"
            >
              <div class="d-flex justify-content-between align-items-center mb-1 pb-1 border-bottom">
                <span class="badge bg-success-subtle text-success border border-success fw-bold">
                  {{ msg.type }}
                </span>
                <small class="text-muted font-monospace">{{ fmtDateTime(msg.created_at) }}</small>
              </div>
              <div class="wa-content font-monospace text-dark mt-2">
                {{ msg.content }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/utils/posApi'
import { fmtDateTime, fmtTimeSeconds } from '@/utils/format'

const activeTickets = ref([])
const logs = ref([])
const outbox = ref([])

const direction = ref('IN')
const credentialType = ref('QR')
const credentialValue = ref('')
const selectedTicketId = ref('')

const busy = ref(false)
const refreshing = ref(false)
const notice = ref(null)

const gate = ref({
  action: null,
  message: '',
  buzzer: ''
})

const currentTicket = computed(() => {
  return activeTickets.value.find(t => t.id === Number(selectedTicketId.value)) || null
})

const gateDisplayClass = computed(() => {
  if (gate.value.action === 'OPEN_GATE') return 'turnstile-open'
  if (gate.value.action === 'KEEP_LOCKED') return 'turnstile-locked'
  return 'turnstile-standby'
})

const isScanDisabled = computed(() => {
  if (busy.value) return true
  if (!credentialValue.value.trim()) return true
  return false
})

const scanBlockReason = computed(() => {
  if (!credentialValue.value.trim()) return 'Pilih tiket dari dropdown atau masukkan kode tiket.'
  return ''
})

const canFastForward = computed(() => {
  const t = currentTicket.value
  return Boolean(t && t.start_time && !t.is_open_play && t.duration_minutes)
})

const canTestReentry = computed(() => {
  const t = currentTicket.value
  return Boolean(t && t.start_time)
})

function onSelectTicket() {
  const t = currentTicket.value
  if (!t) return
  if (credentialType.value === 'RFID' && t.rfid_uid) {
    credentialValue.value = t.rfid_uid
  } else {
    credentialValue.value = t.ticket_code
  }
}

async function refreshAll() {
  refreshing.value = true
  try {
    const [ticketsRes, logsRes, outboxRes] = await Promise.all([
      api('/gate/active-tickets'),
      api('/simulator/logs'),
      api('/simulator/outbox')
    ])

    if (ticketsRes.success) activeTickets.value = ticketsRes.data || []
    if (logsRes.success) logs.value = logsRes.data || []
    if (outboxRes.success) outbox.value = outboxRes.data || []
  } catch (err) {
    console.error('Refresh simulator error:', err)
  } finally {
    refreshing.value = false
  }
}

async function scan() {
  if (isScanDisabled.value) return
  busy.value = true
  notice.value = null

  try {
    const res = await api('/gate/verify-access', {
      method: 'POST',
      body: {
        credential_type: credentialType.value,
        credential_value: credentialValue.value.trim(),
        direction: direction.value,
        gate_code: direction.value === 'IN' ? 'GATE-IN-01' : 'GATE-OUT-01'
      }
    })

    gate.value = {
      action: res.action,
      message: res.message,
      buzzer: res.hardware?.buzzer || ''
    }

    if (res.action === 'OPEN_GATE') {
      notice.value = { type: 'success', text: `Akses ${direction.value} DIIZINKAN untuk ${res.ticket?.visitor_name || 'Pengunjung'}` }
    } else {
      notice.value = { type: 'error', text: `Akses ${direction.value} DITOLAK: ${res.message}` }
    }

    await refreshAll()
  } catch (err) {
    notice.value = { type: 'error', text: err.message || 'Gagal memanggil controller gate.' }
  } finally {
    busy.value = false
  }
}

async function fastForward(minutes) {
  if (!canFastForward.value || busy.value) return
  busy.value = true
  notice.value = null

  try {
    const res = await api('/simulator/fast-forward-time', {
      method: 'POST',
      body: {
        ticket_id: currentTicket.value.id,
        minutes
      }
    })

    if (res.success) {
      notice.value = {
        type: 'success',
        text: `Waktu tiket ${currentTicket.value.ticket_code} dimajukan ${minutes} menit. Tiket sekarang dalam status OVERTIME!`
      }
      await refreshAll()
    } else {
      notice.value = { type: 'error', text: res.message }
    }
  } catch (err) {
    notice.value = { type: 'error', text: err.message }
  } finally {
    busy.value = false
  }
}

async function testReentry() {
  if (!canTestReentry.value || busy.value) return
  busy.value = true
  notice.value = null

  try {
    const t = currentTicket.value
    // Scan out -> Scan in (1) -> Scan out -> Scan in (2) -> Scan out -> Scan in (3 -> tolak)
    const steps = ['OUT', 'IN', 'OUT', 'IN', 'OUT', 'IN']
    let lastResult = null

    for (const d of steps) {
      lastResult = await api('/gate/verify-access', {
        method: 'POST',
        body: {
          credential_type: 'QR',
          credential_value: t.ticket_code,
          direction: d,
          gate_code: d === 'IN' ? 'GATE-IN-01' : 'GATE-OUT-01'
        }
      })
      if (lastResult.action === 'KEEP_LOCKED') {
        break
      }
    }

    gate.value = {
      action: lastResult.action,
      message: lastResult.message,
      buzzer: lastResult.hardware?.buzzer || ''
    }

    notice.value = {
      type: lastResult.action === 'OPEN_GATE' ? 'success' : 'error',
      text: `Uji simulasi re-entry selesai: ${lastResult.message}`
    }

    await refreshAll()
  } catch (err) {
    notice.value = { type: 'error', text: err.message }
  } finally {
    busy.value = false
  }
}

onMounted(refreshAll)
</script>

<style scoped>
.hardware-simulator-page {
  min-height: calc(100vh - 120px);
}

.sim-card {
  width: 100% !important;
  min-width: 0 !important;
}

/* Turnstile OLED & LED Box */
.turnstile-display {
  background: #1e293b;
  color: #ffffff;
  border: 2px solid #334155;
  transition: all 0.3s ease;
  width: 100%;
}

.turnstile-standby {
  border-color: #3b82f6;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.15);
}

.turnstile-open {
  background: #064e3b;
  border-color: #10b981;
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
}

.turnstile-locked {
  background: #7f1d1d;
  border-color: #ef4444;
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
}

.oled-screen {
  background: #0f172a;
  border: 1px solid #334155;
}

.oled-status-title {
  font-size: 1.25rem;
  letter-spacing: 0.5px;
}

/* LED Indicator Lights */
.led-light {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  opacity: 0.3;
  transition: all 0.25s ease;
}

.led-green {
  background: #10b981;
  color: #ffffff;
}

.led-red {
  background: #ef4444;
  color: #ffffff;
}

.led-active {
  opacity: 1 !important;
  box-shadow: 0 0 16px currentColor;
  transform: scale(1.08);
}

/* WhatsApp Bubble Chat */
.whatsapp-bg {
  background-color: #efeae2;
  background-image: radial-gradient(#d1c7b7 1px, transparent 1px);
  background-size: 20px 20px;
}

.wa-bubble {
  border-left: 4px solid #25d366;
  max-width: 100%;
}

.wa-content {
  white-space: pre-wrap !important;
  word-break: break-word !important;
  font-size: 12px;
  line-height: 1.5;
}
</style>
