<template>
  <div class="pt-sim-page">
    <!-- Top Page Bar -->
    <div class="pt-page-bar d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
      <div>
        <h5 class="mb-0 fw-semibold text-dark">Simulator Turnstile Gate</h5>
        <div class="text-muted" style="font-size: 12.5px;">
          Kontrol pengujian akses masuk, keluar, dan validasi tiket
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
          :disabled="refreshing"
          @click="refreshAll"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" :class="{ 'pt-spin': refreshing }">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span>{{ refreshing ? 'Memuat...' : 'Refresh' }}</span>
        </button>
      </div>
    </div>

    <!-- Alert Banner -->
    <div
      v-if="notice"
      class="pt-alert mb-3 d-flex align-items-center justify-content-between"
      :class="notice.type === 'error' ? 'pt-alert-danger' : 'pt-alert-success'"
      role="alert"
    >
      <div class="d-flex align-items-center gap-2">
        <svg v-if="notice.type === 'error'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <span>{{ notice.text }}</span>
      </div>
      <button type="button" class="btn-close btn-sm" aria-label="Tutup" @click="notice = null" />
    </div>

    <!-- Main 2-Column Grid -->
    <div class="row g-3">
      <!-- Left Column: Gate Terminal & Scan Controls -->
      <div class="col-lg-6">
        <div class="pt-panel h-100 d-flex flex-column">
          <div class="pt-panel-header d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /><path d="M15 3v18" />
              </svg>
              <span class="fw-semibold text-dark">Terminal Turnstile Gate</span>
            </div>
            <span class="pt-tag">{{ direction === 'IN' ? 'GATE-IN-01' : 'GATE-OUT-01' }}</span>
          </div>

          <div class="pt-panel-body d-flex flex-column gap-3 flex-grow-1">
            <!-- Compact Hardware Display -->
            <div class="pt-terminal" :class="gateDisplayClass">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="d-flex align-items-center gap-2">
                  <span class="pt-led-pill" :class="{ 'active-pass': gate.action === 'OPEN_GATE' }">
                    <span class="pt-dot pass" /> PASS
                  </span>
                  <span class="pt-led-pill" :class="{ 'active-stop': gate.action === 'KEEP_LOCKED' }">
                    <span class="pt-dot stop" /> STOP
                  </span>
                </div>

                <div class="d-flex align-items-center gap-2">
                  <span class="pt-hw-meta">Buzzer: {{ gate.buzzer || 'Standby' }}</span>
                  <span class="pt-hw-meta" :class="{ 'unlocked': gate.action === 'OPEN_GATE' }">
                    Solenoid: {{ gate.action === 'OPEN_GATE' ? 'TERBUKA' : 'TERKUNCI' }}
                  </span>
                </div>
              </div>

              <div class="pt-terminal-screen">
                <div class="pt-terminal-title">
                  {{
                    gate.action === 'OPEN_GATE'
                      ? 'AKSES DIIZINKAN — SILAKAN MELINTAS'
                      : gate.action === 'KEEP_LOCKED'
                        ? 'AKSES DITOLAK — GATE TERKUNCI'
                        : 'SIAP SCAN TIKET / KARTU RFID'
                  }}
                </div>
                <div class="pt-terminal-sub">
                  {{ gate.message || 'Pilih tiket aktif atau masukkan kode kredensial untuk menguji respon gate.' }}
                </div>
              </div>
            </div>

            <!-- Form Controls -->
            <div class="pt-control-box d-flex flex-column gap-3">
              <!-- Direction -->
              <div>
                <label class="pt-label">Arah Jalur Gate</label>
                <div class="pt-seg-group">
                  <button
                    type="button"
                    class="pt-seg-btn"
                    :class="{ 'active-in': direction === 'IN' }"
                    :disabled="busy"
                    @click="direction = 'IN'"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                    <span>Jalur Masuk (IN)</span>
                  </button>
                  <button
                    type="button"
                    class="pt-seg-btn"
                    :class="{ 'active-out': direction === 'OUT' }"
                    :disabled="busy"
                    @click="direction = 'OUT'"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>Jalur Keluar (OUT)</span>
                  </button>
                </div>
              </div>

              <!-- Active Ticket Select -->
              <div>
                <label class="pt-label" for="ticket-select">Tiket Aktif Hari Ini</label>
                <select
                  id="ticket-select"
                  v-model="selectedTicketId"
                  class="form-select pt-input"
                  :disabled="busy"
                  @change="onSelectTicket"
                >
                  <option value="">
                    {{ activeTickets.length ? 'Pilih tiket pengunjung...' : 'Tidak ada tiket aktif hari ini' }}
                  </option>
                  <option
                    v-for="t in activeTickets"
                    :key="t.id"
                    :value="t.id"
                  >
                    {{ t.ticket_code }} — {{ t.visitor_name }} ({{ t.package_name }})
                  </option>
                </select>
              </div>

              <!-- Selected Ticket Meta -->
              <div v-if="currentTicket" class="pt-ticket-summary d-flex justify-content-between align-items-center">
                <div>
                  <div class="fw-semibold text-dark" style="font-size: 13px;">{{ currentTicket.visitor_name }}</div>
                  <div class="text-muted" style="font-size: 11.5px;">{{ currentTicket.package_name }}</div>
                </div>
                <div class="d-flex align-items-center gap-3" style="font-size: 12px;">
                  <span class="text-muted">Re-entry: <strong class="text-dark">{{ currentTicket.reentry_count || 0 }}/{{ currentTicket.max_reentry || 2 }}</strong></span>
                  <span class="pt-tag">{{ currentTicket.status || 'ACTIVE' }}</span>
                </div>
              </div>

              <!-- Credential Input -->
              <div class="row g-2">
                <div class="col-sm-4">
                  <label class="pt-label" for="cred-type">Tipe Reader</label>
                  <select
                    id="cred-type"
                    v-model="credentialType"
                    class="form-select pt-input"
                    :disabled="busy"
                  >
                    <option value="QR">QR / Barcode</option>
                    <option value="RFID">Kartu RFID</option>
                  </select>
                </div>
                <div class="col-sm-8">
                  <label class="pt-label" for="cred-value">Kode Tiket / UID RFID</label>
                  <input
                    id="cred-value"
                    v-model.trim="credentialValue"
                    type="text"
                    class="form-control pt-input font-monospace"
                    placeholder="Masukkan kode tiket atau UID"
                    :disabled="busy"
                    @keyup.enter="scan"
                  >
                </div>
              </div>

              <!-- Submit Scan -->
              <button
                type="button"
                class="pt-btn-scan w-100"
                :disabled="isScanDisabled"
                @click="scan"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" />
                  <path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                  <line x1="7" y1="12" x2="17" y2="12" />
                </svg>
                <span>{{ busy ? 'Memproses...' : 'Proses Scan Gate' }}</span>
              </button>
            </div>

            <!-- Quick Scenario Actions (Minimal Footer) -->
            <div class="pt-scenario-bar mt-auto d-flex flex-wrap align-items-center justify-content-between gap-2">
              <span class="text-muted fw-medium" style="font-size: 12px;">Skenario Uji Cepat</span>
              <div class="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  class="pt-btn-subtle"
                  :disabled="!canFastForward || busy"
                  @click="fastForward(75)"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>Majukan +75 Menit</span>
                </button>
                <button
                  type="button"
                  class="pt-btn-subtle"
                  :disabled="!canTestReentry || busy"
                  @click="testReentry"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                    <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                  </svg>
                  <span>Uji Batas Re-entry</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Access Logs & Notification Log -->
      <div class="col-lg-6 d-flex flex-column gap-3">
        <!-- Access Logs Card -->
        <div class="pt-panel">
          <div class="pt-panel-header d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span class="fw-semibold text-dark">Riwayat Scan Gate</span>
            </div>
            <span class="pt-tag">{{ logs.length }} Aktivitas</span>
          </div>

          <div class="table-responsive" style="max-height: 290px; overflow-y: auto;">
            <table class="table pt-table align-middle mb-0">
              <thead class="sticky-top">
                <tr>
                  <th style="width: 90px;">Waktu</th>
                  <th style="width: 75px;">Arah</th>
                  <th>Kode Tiket</th>
                  <th style="width: 145px;" class="text-end">Status Akses</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="logs.length === 0">
                  <td colspan="4" class="text-center text-muted py-4" style="font-size: 13px;">
                    Belum ada aktivitas scan hari ini.
                  </td>
                </tr>
                <tr v-for="log in logs" :key="log.id">
                  <td class="font-monospace text-muted" style="font-size: 12px;">
                    {{ fmtTimeSeconds(log.scanned_at) }}
                  </td>
                  <td>
                    <span
                      class="pt-dir-badge"
                      :class="String(log.direction).toUpperCase() === 'IN' ? 'in' : 'out'"
                    >
                      {{ String(log.direction).toUpperCase() }}
                    </span>
                  </td>
                  <td class="font-monospace fw-medium text-dark" style="font-size: 12.5px;">
                    {{ log.ticket_code || log.credential_value }}
                  </td>
                  <td class="text-end">
                    <span
                      class="pt-status-badge"
                      :class="log.is_allowed ? 'allowed' : 'denied'"
                    >
                      {{ log.is_allowed ? 'Diizinkan' : 'Ditolak' }}
                    </span>
                    <div v-if="log.deny_reason" class="text-danger font-monospace mt-1" style="font-size: 10.5px;">
                      {{ log.deny_reason }}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Notification Log Card -->
        <div class="pt-panel flex-grow-1 d-flex flex-column">
          <div class="pt-panel-header d-flex justify-content-between align-items-center">
            <div class="d-flex align-items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span class="fw-semibold text-dark">Log Notifikasi Pesan</span>
            </div>
            <span class="pt-tag">{{ outbox.length }} Pesan</span>
          </div>

          <div class="pt-panel-body flex-grow-1" style="max-height: 280px; overflow-y: auto;">
            <div
              v-if="outbox.length === 0"
              class="text-center text-muted py-4"
              style="font-size: 13px;"
            >
              Belum ada pesan notifikasi keluar.
            </div>

            <div
              v-for="msg in outbox"
              :key="msg.id"
              class="pt-msg-item mb-2"
            >
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="pt-msg-type">{{ msg.type }}</span>
                <span class="text-muted font-monospace" style="font-size: 11px;">{{ fmtDateTime(msg.created_at) }}</span>
              </div>
              <div class="pt-msg-body">
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
  if (gate.value.action === 'OPEN_GATE') return 'is-open'
  if (gate.value.action === 'KEEP_LOCKED') return 'is-locked'
  return 'is-standby'
})

const isScanDisabled = computed(() => {
  if (busy.value) return true
  if (!credentialValue.value.trim()) return true
  return false
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
      notice.value = { type: 'success', text: `Akses ${direction.value} diizinkan untuk ${res.ticket?.visitor_name || 'Pengunjung'}.` }
    } else {
      notice.value = { type: 'error', text: `Akses ${direction.value} ditolak: ${res.message}` }
    }

    await refreshAll()
  } catch (err) {
    notice.value = { type: 'error', text: err.message || 'Gagal memproses respon gate.' }
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
        text: `Waktu bermain tiket ${currentTicket.value.ticket_code} dimajukan ${minutes} menit.`
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
      text: `Hasil uji re-entry: ${lastResult.message}`
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
.pt-sim-page {
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

.pt-panel-body {
  padding: 16px 18px;
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

/* Compact Turnstile Status Display */
.pt-terminal {
  background: #0f172a;
  color: #f8fafc;
  border-radius: 10px;
  padding: 14px 16px;
  border: 1px solid #1e293b;
  transition: all 0.2s ease;
}

.pt-terminal.is-open {
  background: #064e3b;
  border-color: #059669;
}

.pt-terminal.is-locked {
  background: #4c0519;
  border-color: #e11d48;
}

.pt-led-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.45);
}

.pt-led-pill.active-pass {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
}

.pt-led-pill.active-stop {
  background: rgba(244, 63, 94, 0.25);
  color: #fda4af;
}

.pt-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}

.pt-hw-meta {
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.06);
  padding: 3px 8px;
  border-radius: 5px;
}

.pt-hw-meta.unlocked {
  color: #6ee7b7;
  background: rgba(16, 185, 129, 0.18);
}

.pt-terminal-screen {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 14px 16px;
  text-align: center;
}

.pt-terminal-title {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: #ffffff;
}

.pt-terminal-sub {
  font-size: 12px;
  color: #cbd5e1;
  margin-top: 4px;
}

/* Controls */
.pt-control-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px;
}

.pt-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 6px;
}

.pt-seg-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.pt-seg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 9px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  transition: all 0.15s ease;
}

.pt-seg-btn:hover:not(:disabled) {
  border-color: #94a3b8;
  color: #0f172a;
}

.pt-seg-btn.active-in {
  background: #0284c7;
  border-color: #0284c7;
  color: #ffffff;
}

.pt-seg-btn.active-out {
  background: #0f172a;
  border-color: #0f172a;
  color: #ffffff;
}

.pt-input {
  font-size: 13px;
  border-color: #cbd5e1;
  border-radius: 8px;
  padding: 8px 12px;
}

.pt-input:focus {
  border-color: #0284c7;
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.12);
}

.pt-ticket-summary {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
}

.pt-btn-scan {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 16px;
  font-size: 13.5px;
  font-weight: 600;
  color: #ffffff;
  background: #0284c7;
  border: none;
  border-radius: 8px;
  transition: background 0.15s ease;
}

.pt-btn-scan:hover:not(:disabled) {
  background: #0369a1;
}

.pt-btn-scan:disabled {
  background: #cbd5e1;
  color: #64748b;
  cursor: not-allowed;
}

.pt-scenario-bar {
  padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}

.pt-btn-subtle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  font-size: 12px;
  font-weight: 500;
  color: #475569;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  transition: all 0.15s ease;
}

.pt-btn-subtle:hover:not(:disabled) {
  background: #f1f5f9;
  color: #0f172a;
}

.pt-btn-subtle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Tables & Logs */
.pt-table th {
  background: #f8fafc;
  font-size: 11.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #64748b;
  border-bottom: 1px solid #e2e8f0;
  padding: 10px 14px;
}

.pt-table td {
  padding: 10px 14px;
  border-bottom: 1px solid #f1f5f9;
}

.pt-dir-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
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
  padding: 2px 9px;
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

.pt-msg-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
}

.pt-msg-type {
  font-size: 11px;
  font-weight: 600;
  color: #0284c7;
  background: #e0f2fe;
  padding: 2px 7px;
  border-radius: 4px;
}

.pt-msg-body {
  font-size: 12.5px;
  color: #334155;
  line-height: 1.45;
  margin-top: 4px;
}

@keyframes pt-spin {
  to { transform: rotate(360deg); }
}

.pt-spin {
  animation: pt-spin 0.8s linear infinite;
}
</style>
