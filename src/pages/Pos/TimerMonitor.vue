<template>
  <div class="tm-screen">
    <!-- Top TV Header -->
    <header class="tm-header">
      <div class="tm-brand">
        <img :src="logoUrl" alt="Playtopia" class="tm-logo" />
        <div>
          <div class="tm-title">MONITOR TIMER AREA BERMAIN</div>
          <div class="tm-subtitle">Pantau sisa waktu bermain anak secara langsung &bull; Toleransi keluar 10 menit</div>
        </div>
      </div>

      <!-- Status Counters -->
      <div class="tm-counters">
        <div class="tm-counter-box total">
          <span class="tm-counter-val">{{ activeVisitors.length }}</span>
          <span class="tm-counter-lbl">Anak Bermain</span>
        </div>
        <div class="tm-counter-box safe">
          <span class="tm-counter-val">{{ safeCount }}</span>
          <span class="tm-counter-lbl">Waktu Aman</span>
        </div>
        <div class="tm-counter-box warn">
          <span class="tm-counter-val">{{ warningCount }}</span>
          <span class="tm-counter-lbl">&le; 15 Menit</span>
        </div>
        <div class="tm-counter-box danger" :class="{ 'tm-pulse-danger': overtimeList.length > 0 }">
          <span class="tm-counter-val">{{ overtimeList.length }}</span>
          <span class="tm-counter-lbl">Waktu Habis</span>
        </div>
      </div>

      <!-- Right Controls: Clock, Mute/Unmute Bell (Default Mute), Fullscreen -->
      <div class="tm-right-bar">
        <div class="tm-clock-box">
          <div class="tm-clock-time">{{ clockTime }}</div>
          <div class="tm-clock-date">{{ clockDate }}</div>
        </div>

        <div class="tm-actions">
          <button
            type="button"
            class="tm-btn"
            :class="isMuted ? 'tm-btn-muted' : 'tm-btn-unmuted'"
            @click="toggleAudioMute"
            :title="isMuted ? 'Klik untuk mengaktifkan suara bel saat waktu habis' : 'Suara bel aktif (Klik untuk bisukan)'"
          >
            <span v-if="isMuted">🔇 Bel: Mute (Default)</span>
            <span v-else>🔔 Bel: Aktif (Unmute)</span>
          </button>

          <button
            v-if="!isMuted"
            type="button"
            class="tm-btn tm-btn-outline"
            title="Uji bunyi bel peringatan"
            @click="playAlertBell()"
          >
            🔊 Tes Bel
          </button>

          <button
            type="button"
            class="tm-btn tm-btn-outline"
            title="Tampilkan layar penuh di TV Monitor"
            @click="toggleFullscreen"
          >
            ⛶ {{ isFullscreen ? 'Keluar Penuh' : 'Layar Penuh' }}
          </button>
        </div>
      </div>
    </header>

    <!-- Flashing Banner when someone's play time is up (Unpaid Overtime) -->
    <div v-if="overtimeList.length > 0" class="tm-overtime-banner">
      <div class="tm-overtime-icon">⏰</div>
      <div class="tm-overtime-text">
        <strong>PERHATIAN — WAKTU BERMAIN TELAH HABIS (OVERTIME):</strong>
        <span>
          {{ overtimeList.map(v => `${v.visitor_name} (+${v.live_overtime_minutes} mnt)`).join('  •  ') }}
        </span>
      </div>
      <div class="tm-overtime-note">Silakan selesaikan di Kasir &amp; Out Gate</div>
    </div>

    <!-- Banner Pengumuman -15 Menit Sebelum Waktu Habis -->
    <div v-if="warningList.length > 0" class="tm-warning-banner">
      <div class="tm-overtime-icon">📢</div>
      <div class="tm-overtime-text">
        <strong>PENGUMUMAN -15 MENIT (PERSIAPAN SELESAI):</strong>
        <span>
          {{ warningList.map(v => `${v.visitor_name} (Sisa ${Math.ceil(v.live_remaining_seconds / 60)} mnt)`).join('  •  ') }}
        </span>
      </div>
      <div class="tm-overtime-note">Segera bersiap menuju Pintu Keluar</div>
    </div>

    <!-- Main Monitor Content -->
    <main class="tm-body">
      <div v-if="loading && visitors.length === 0" class="tm-empty">
        <div class="tm-empty-title">Memuat Data Timer Pengunjung...</div>
      </div>

      <div v-else-if="displayVisitors.length === 0" class="tm-empty">
        <div class="tm-empty-icon">🎠</div>
        <div class="tm-empty-title">Belum Ada Pengunjung Aktif di Area Bermain</div>
        <div class="tm-empty-sub">
          Nama anak dari Form Waiver / Member dan hitungan mundur waktu bermain akan otomatis muncul di layar ini begitu tiket di-scan masuk pada Turnstile Gate.
        </div>
      </div>

      <div v-else class="tm-grid">
        <div
          v-for="v in paginatedVisitors"
          :key="v.id"
          class="tm-card"
          :class="cardClass(v)"
        >
          <!-- Card Top: Status Pill & Ticket Code -->
          <div class="tm-card-top">
            <span class="tm-status-pill" :class="cardClass(v)">
              {{ statusLabel(v) }}
            </span>
            <span class="tm-ticket-code">{{ v.ticket_code }}</span>
          </div>

          <!-- Visitor / Child Name (from Waiver / Member) -->
          <div class="tm-visitor-name" :title="v.visitor_name">
            {{ v.visitor_name }}
          </div>

          <div class="tm-package-name">
            {{ v.package_name }}
          </div>

          <!-- Big Countdown Display -->
          <div class="tm-timer-box">
            <template v-if="v.status !== 'active' || !v.start_time">
              <div class="tm-timer-waiting">BELUM SCAN MASUK</div>
              <div class="tm-timer-sub">Durasi Paket: {{ v.is_open_play ? 'Sepuasnya' : `${v.duration_minutes} Menit` }}</div>
            </template>

            <template v-else-if="v.is_open_play">
              <div class="tm-timer-unlimited">SEPUASNYA</div>
              <div class="tm-timer-sub">Bebas bermain sepanjang hari operasional</div>
            </template>

            <template v-else-if="v.overtime_paid === 1">
              <div class="tm-timer-unlimited" style="color: #4ade80; font-size: 22px;">
                ✓ LUNAS — SIAP OUT GATE
              </div>
              <div class="tm-timer-sub">
                Silakan scan gelang/tiket di Gate Keluar
              </div>
            </template>

            <template v-else-if="v.live_is_overtime">
              <div class="tm-timer-overtime">
                -{{ formatCountdown(Math.abs(v.live_remaining_seconds)) }}
              </div>
              <div class="tm-timer-sub text-danger-bright">
                Lewat {{ v.live_overtime_minutes }} menit &bull; Charge 1 Tiket
              </div>
            </template>

            <template v-else>
              <div class="tm-timer-digits">
                {{ formatCountdown(v.live_remaining_seconds) }}
              </div>
              <div class="tm-timer-sub">
                Sisa waktu bermain ({{ Math.ceil(v.live_remaining_seconds / 60) }} menit)
              </div>
            </template>
          </div>

          <!-- Progress Bar -->
          <div class="tm-progress-track">
            <div
              class="tm-progress-fill"
              :class="cardClass(v)"
              :style="{ width: `${progressPercent(v)}%` }"
            />
          </div>

          <!-- Card Footer: Check-In & End Time -->
          <div class="tm-card-footer">
            <div>
              <span class="tm-foot-lbl">Masuk:</span>
              <strong class="tm-foot-val">{{ v.start_time ? fmtClock(v.start_time) : '-' }}</strong>
            </div>
            <div>
              <span class="tm-foot-lbl">Selesai:</span>
              <strong class="tm-foot-val">{{ v.is_open_play ? 'Tutup' : (v.expiry_time ? fmtClock(v.expiry_time) : '-') }}</strong>
            </div>
            <div>
              <span class="tm-foot-lbl">Toilet:</span>
              <strong class="tm-foot-val">{{ v.reentry_count || 0 }}/{{ v.max_reentry ?? 2 }}</strong>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Bottom Footer / Pagination & Filter -->
    <footer class="tm-footer">
      <div class="d-flex align-items-center gap-3">
        <span class="tm-footer-info">
          🔄 Sinkronisasi otomatis setiap 5 detik &bull; Otomatis hilang dari layar begitu pengunjung Scan Out Gate
        </span>
      </div>

      <div v-if="totalPages > 1" class="d-flex align-items-center gap-2">
        <button type="button" class="tm-page-btn" @click="prevPage">&lsaquo;</button>
        <span class="tm-page-indicator">Halaman {{ currentPage }} / {{ totalPages }} (Rotasi Otomatis)</span>
        <button type="button" class="tm-page-btn" @click="nextPage">&rsaquo;</button>
      </div>

      <div class="tm-footer-right">
        Playtopia Playground &amp; Cafe POS &bull; Layar Monitor Timer Pengunjung
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import logoUrl from '@/assets/playtopia-logo.png'
import { api } from '@/utils/posApi'

const visitors = ref([])
const loading = ref(true)
const nowMs = ref(Date.now())
const serverOffsetMs = ref(0)

// Default MUTE sesuai permintaan user (harus klik Unmute untuk mengaktifkan suara bel)
const isMuted = ref(true)
const isFullscreen = ref(false)
const showUnusedTickets = ref(true)

// Pagination untuk layar TV jika pengunjung banyak
const ITEMS_PER_PAGE = 12
const currentPage = ref(1)

// Set ID tiket yang sudah pernah dibunyikan belnya (saat -15 menit & saat waktu habis)
const alertedWarningIds = new Set()
const alertedOvertimeIds = new Set()
let audioCtx = null

const clockTime = computed(() => {
  return new Date(nowMs.value).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
})

const clockDate = computed(() => {
  return new Date(nowMs.value).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
})

// Hitung sisa detik secara live setiap 1 detik
const enrichedVisitors = computed(() => {
  const currentServerTime = nowMs.value + serverOffsetMs.value
  return visitors.value.map(v => {
    const isOpenPlay = Boolean(v.is_open_play) || !v.duration_minutes
    if (v.status !== 'active' || !v.start_time || !v.expiry_time) {
      return {
        ...v,
        is_open_play: isOpenPlay,
        live_remaining_seconds: (v.duration_minutes || 0) * 60,
        live_is_overtime: false,
        live_overtime_minutes: 0
      }
    }

    const expiryMs = new Date(v.expiry_time).getTime()
    const diffSec = Math.floor((expiryMs - currentServerTime) / 1000)
    const isOvertime = diffSec < 0 && !isOpenPlay
    const overtimeMins = isOvertime ? Math.ceil(Math.abs(diffSec) / 60) : 0

    return {
      ...v,
      is_open_play: isOpenPlay,
      live_remaining_seconds: diffSec,
      live_is_overtime: isOvertime,
      live_overtime_minutes: overtimeMins
    }
  })
})

const activeVisitors = computed(() => enrichedVisitors.value.filter(v => v.status === 'active'))
const unusedCount = computed(() => enrichedVisitors.value.filter(v => v.status !== 'active').length)

const displayVisitors = computed(() => {
  const list = activeVisitors.value

  // Urutkan: 1. Waktu Habis (Overtime belum lunas), 2. Sisa <= 15 menit (-15 mnt), 3. Overtime Lunas (Siap Out), 4. Normal, 5. Sepuasnya
  return [...list].sort((a, b) => {
    const rank = (item) => {
      if (item.live_is_overtime && item.overtime_paid !== 1) return 0
      if (!item.is_open_play && item.live_remaining_seconds <= 900 && item.overtime_paid !== 1) return 1
      if (item.overtime_paid === 1) return 2
      if (item.is_open_play) return 4
      return 3
    }
    const rA = rank(a)
    const rB = rank(b)
    if (rA !== rB) return rA - rB
    return a.live_remaining_seconds - b.live_remaining_seconds
  })
})

const overtimeList = computed(() => activeVisitors.value.filter(v => v.live_is_overtime && v.overtime_paid !== 1))
const warningList = computed(() => activeVisitors.value.filter(v => !v.live_is_overtime && v.overtime_paid !== 1 && !v.is_open_play && v.live_remaining_seconds <= 900))
const warningCount = computed(() => warningList.value.length)
const safeCount = computed(() => activeVisitors.value.filter(v => (!v.live_is_overtime || v.overtime_paid === 1) && (v.is_open_play || v.live_remaining_seconds > 900 || v.overtime_paid === 1)).length)

const totalPages = computed(() => Math.max(1, Math.ceil(displayVisitors.value.length / ITEMS_PER_PAGE)))

const paginatedVisitors = computed(() => {
  const page = Math.min(currentPage.value, totalPages.value)
  const start = (page - 1) * ITEMS_PER_PAGE
  return displayVisitors.value.slice(start, start + ITEMS_PER_PAGE)
})

function prevPage() {
  currentPage.value = currentPage.value <= 1 ? totalPages.value : currentPage.value - 1
}

function nextPage() {
  currentPage.value = currentPage.value >= totalPages.value ? 1 : currentPage.value + 1
}

function cardClass(v) {
  if (v.status !== 'active') return 'state-waiting'
  if (v.overtime_paid === 1) return 'state-safe'
  if (v.live_is_overtime) return 'state-overtime'
  if (v.is_open_play) return 'state-unlimited'
  if (v.live_remaining_seconds <= 900) return 'state-warning'
  return 'state-safe'
}

function statusLabel(v) {
  if (v.status !== 'active') return 'MENUNGGU MASUK GATE'
  if (v.overtime_paid === 1) return '✓ SIAP OUT GATE'
  if (v.live_is_overtime) return '⏰ WAKTU HABIS / OVERTIME'
  if (v.is_open_play) return '∞ SEPUASNYA'
  if (v.live_remaining_seconds <= 900) return '📢 SISA ≤ 15 MENIT (-15M)'
  return '● SEDANG BERMAIN'
}

function progressPercent(v) {
  if (v.status !== 'active') return 100
  if (v.is_open_play) return 100
  if (v.live_is_overtime) return 100
  const totalSec = ((Number(v.duration_minutes) || 60) + (Number(v.grace_period_minutes) || 10)) * 60
  if (totalSec <= 0) return 100
  return Math.max(4, Math.min(100, Math.round((v.live_remaining_seconds / totalSec) * 100)))
}

function formatCountdown(seconds) {
  const s = Math.max(0, Math.floor(seconds))
  const hrs = Math.floor(s / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60
  const pad = (n) => String(n).padStart(2, '0')
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`
  }
  return `${pad(mins)}:${pad(secs)}`
}

function fmtClock(isoStr) {
  if (!isoStr) return '-'
  const d = new Date(isoStr)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

// Web Audio API Chime / Bell Generator
function ensureAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

function playAlertBell() {
  if (isMuted.value) return
  const ctx = ensureAudioContext()
  if (!ctx) return

  // Nada chime pengumuman 3 nada (C5 - E5 - G5 - C6)
  const notes = [523.25, 659.25, 783.99, 1046.5]
  const now = ctx.currentTime

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now + idx * 0.22)

    gain.gain.setValueAtTime(0.001, now + idx * 0.22)
    gain.gain.exponentialRampToValueAtTime(0.28, now + idx * 0.22 + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.22 + 0.65)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now + idx * 0.22)
    osc.stop(now + idx * 0.22 + 0.7)
  })
}

function toggleAudioMute() {
  isMuted.value = !isMuted.value
  if (!isMuted.value) {
    ensureAudioContext()
    playAlertBell()
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().then(() => {
      isFullscreen.value = true
    }).catch(() => {})
  } else {
    document.exitFullscreen?.().then(() => {
      isFullscreen.value = false
    }).catch(() => {})
  }
}

async function fetchMonitorData() {
  try {
    const res = await api('/gate/timer-monitor')
    if (res.success && Array.isArray(res.data)) {
      if (res.server_time) {
        const srvMs = new Date(res.server_time).getTime()
        if (!Number.isNaN(srvMs)) {
          serverOffsetMs.value = srvMs - Date.now()
        }
      }
      visitors.value = res.data

      // Cek apakah ada tiket yang baru masuk overtime untuk membunyikan bel (jika tidak di-mute)
      for (const v of res.data) {
        if (v.status === 'active' && v.is_overtime) {
          if (!alertedOvertimeIds.has(v.id)) {
            alertedOvertimeIds.add(v.id)
            if (!isMuted.value) {
              playAlertBell()
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Timer monitor poll warning:', err.message)
  } finally {
    loading.value = false
  }
}

let clockTimer = null
let pollTimer = null
let pageRotateTimer = null

onMounted(() => {
  fetchMonitorData()

  // Update detik setiap 1 detik & deteksi transisi -15 menit maupun waktu habis secara real-time
  clockTimer = setInterval(() => {
    nowMs.value = Date.now()
    for (const v of enrichedVisitors.value) {
      if (v.status === 'active' && v.overtime_paid !== 1) {
        if (!v.is_open_play && !v.live_is_overtime && v.live_remaining_seconds <= 900 && !alertedWarningIds.has(v.id)) {
          alertedWarningIds.add(v.id)
          if (!isMuted.value) {
            playAlertBell()
          }
        }
        if (v.live_is_overtime && !alertedOvertimeIds.has(v.id)) {
          alertedOvertimeIds.add(v.id)
          if (!isMuted.value) {
            playAlertBell()
          }
        }
      }
    }
  }, 1000)

  // Sinkronisasi API setiap 5 detik
  pollTimer = setInterval(fetchMonitorData, 5000)

  // Rotasi halaman otomatis setiap 10 detik jika lebih dari 1 halaman
  pageRotateTimer = setInterval(() => {
    if (totalPages.value > 1) {
      nextPage()
    }
  }, 10000)
})

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
  if (pollTimer) clearInterval(pollTimer)
  if (pageRotateTimer) clearInterval(pageRotateTimer)
})
</script>

<style scoped>
.tm-screen {
  min-height: 100vh;
  background: radial-gradient(circle at top right, #1e293b 0%, #0f172a 100%);
  color: #f8fafc;
  display: flex;
  flex-direction: column;
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
  overflow-x: hidden;
}

/* Header */
.tm-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 28px;
  background: rgba(15, 23, 42, 0.85);
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  backdrop-filter: blur(10px);
}

.tm-brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.tm-logo {
  height: 48px;
  width: auto;
  object-fit: contain;
  background: #ffffff;
  padding: 5px 10px;
  border-radius: 10px;
}

.tm-title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #38bdf8;
}

.tm-subtitle {
  font-size: 12.5px;
  color: #94a3b8;
}

/* Counters */
.tm-counters {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tm-counter-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 110px;
  padding: 8px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(30, 41, 59, 0.8);
}

.tm-counter-box.total .tm-counter-val { color: #38bdf8; }
.tm-counter-box.safe .tm-counter-val { color: #4ade80; }
.tm-counter-box.warn .tm-counter-val { color: #fbbf24; }
.tm-counter-box.danger .tm-counter-val { color: #f87171; }

.tm-counter-val {
  font-size: 24px;
  font-weight: 800;
  line-height: 1.1;
}

.tm-counter-lbl {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: #cbd5e1;
  margin-top: 2px;
}

/* Clock & Buttons */
.tm-right-bar {
  display: flex;
  align-items: center;
  gap: 16px;
}

.tm-clock-box {
  text-align: right;
}

.tm-clock-time {
  font-size: 26px;
  font-weight: 800;
  font-family: 'JetBrains Mono', monospace;
  color: #f8fafc;
  line-height: 1.1;
}

.tm-clock-date {
  font-size: 12px;
  color: #94a3b8;
}

.tm-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tm-btn {
  border: none;
  border-radius: 9px;
  padding: 9px 14px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tm-btn-muted {
  background: rgba(148, 163, 184, 0.18);
  color: #cbd5e1;
  border: 1px solid rgba(148, 163, 184, 0.35);
}

.tm-btn-muted:hover {
  background: rgba(148, 163, 184, 0.28);
  color: #ffffff;
}

.tm-btn-unmuted {
  background: #16a34a;
  color: #ffffff;
  box-shadow: 0 0 14px rgba(22, 163, 74, 0.45);
}

.tm-btn-outline {
  background: rgba(30, 41, 59, 0.9);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.3);
}

.tm-btn-outline:hover {
  border-color: #38bdf8;
  color: #38bdf8;
}

/* Overtime Banner */
.tm-overtime-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 28px;
  background: linear-gradient(90deg, #b91c1c 0%, #dc2626 50%, #991b1b 100%);
  color: #ffffff;
  font-size: 15px;
  animation: tm-flash 1.4s infinite alternate;
}

.tm-warning-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 28px;
  background: linear-gradient(90deg, #b45309 0%, #d97706 50%, #92400e 100%);
  color: #ffffff;
  font-size: 14.5px;
}

.tm-overtime-icon {
  font-size: 22px;
}

.tm-overtime-text {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.tm-overtime-note {
  font-size: 12.5px;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.25);
  padding: 4px 12px;
  border-radius: 999px;
}

/* Main Grid */
.tm-body {
  flex: 1;
  padding: 22px 28px;
  display: flex;
  flex-direction: column;
}

.tm-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 24px;
  border: 2px dashed rgba(148, 163, 184, 0.2);
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.4);
}

.tm-empty-icon {
  font-size: 56px;
  margin-bottom: 12px;
}

.tm-empty-title {
  font-size: 24px;
  font-weight: 800;
  color: #e2e8f0;
  margin-bottom: 8px;
}

.tm-empty-sub {
  max-width: 580px;
  font-size: 14.5px;
  color: #94a3b8;
}

.tm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 18px;
}

/* Visitor Card */
.tm-card {
  background: rgba(30, 41, 59, 0.88);
  border: 2px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.tm-card.state-safe {
  border-color: rgba(74, 222, 128, 0.4);
}

.tm-card.state-unlimited {
  border-color: rgba(56, 189, 248, 0.45);
}

.tm-card.state-warning {
  border-color: #f59e0b;
  background: linear-gradient(180deg, rgba(120, 53, 15, 0.45) 0%, rgba(30, 41, 59, 0.92) 100%);
}

.tm-card.state-overtime {
  border-color: #ef4444;
  background: linear-gradient(180deg, rgba(127, 29, 29, 0.72) 0%, rgba(30, 41, 59, 0.95) 100%);
  animation: tm-pulse-card 1.2s infinite alternate;
}

.tm-card.state-waiting {
  border-color: rgba(148, 163, 184, 0.22);
  opacity: 0.82;
}

.tm-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.tm-status-pill {
  font-size: 10.5px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 999px;
  letter-spacing: 0.03em;
}

.tm-status-pill.state-safe {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
}

.tm-status-pill.state-unlimited {
  background: rgba(14, 165, 233, 0.2);
  color: #38bdf8;
}

.tm-status-pill.state-warning {
  background: rgba(245, 158, 11, 0.25);
  color: #fbbf24;
}

.tm-status-pill.state-overtime {
  background: #ef4444;
  color: #ffffff;
}

.tm-status-pill.state-waiting {
  background: rgba(148, 163, 184, 0.2);
  color: #cbd5e1;
}

.tm-ticket-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  color: #94a3b8;
}

.tm-visitor-name {
  font-size: 22px;
  font-weight: 800;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.tm-package-name {
  font-size: 12.5px;
  color: #94a3b8;
  margin-top: 2px;
  margin-bottom: 12px;
}

/* Timer Centerpiece */
.tm-timer-box {
  background: rgba(15, 23, 42, 0.65);
  border-radius: 12px;
  padding: 12px 10px;
  text-align: center;
  margin-bottom: 12px;
}

.tm-timer-digits {
  font-family: 'JetBrains Mono', monospace;
  font-size: 36px;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #f8fafc;
  line-height: 1.1;
}

.state-warning .tm-timer-digits {
  color: #fbbf24;
}

.tm-timer-overtime {
  font-family: 'JetBrains Mono', monospace;
  font-size: 36px;
  font-weight: 800;
  color: #fca5a5;
  line-height: 1.1;
}

.tm-timer-unlimited {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #38bdf8;
  line-height: 1.25;
}

.tm-timer-waiting {
  font-size: 18px;
  font-weight: 800;
  color: #cbd5e1;
  line-height: 1.4;
}

.tm-timer-sub {
  font-size: 11.5px;
  color: #94a3b8;
  margin-top: 4px;
}

.text-danger-bright {
  color: #fecaca !important;
  font-weight: 700;
}

/* Progress Bar */
.tm-progress-track {
  height: 7px;
  background: rgba(15, 23, 42, 0.8);
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 12px;
}

.tm-progress-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.8s linear;
}

.tm-progress-fill.state-safe { background: #22c55e; }
.tm-progress-fill.state-unlimited { background: #0ea5e9; }
.tm-progress-fill.state-warning { background: #f59e0b; }
.tm-progress-fill.state-overtime { background: #ef4444; }
.tm-progress-fill.state-waiting { background: #64748b; }

/* Card Footer */
.tm-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  padding-top: 8px;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
}

.tm-foot-lbl {
  color: #94a3b8;
  margin-right: 4px;
}

.tm-foot-val {
  color: #e2e8f0;
  font-family: 'JetBrains Mono', monospace;
}

/* Footer */
.tm-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 28px;
  background: rgba(15, 23, 42, 0.9);
  border-top: 1px solid rgba(148, 163, 184, 0.15);
  font-size: 12.5px;
  color: #94a3b8;
}

.tm-checkbox-lbl {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: #cbd5e1;
}

.tm-page-btn {
  background: rgba(30, 41, 59, 0.9);
  color: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 6px;
  padding: 2px 10px;
  cursor: pointer;
}

.tm-page-indicator {
  font-weight: 600;
  color: #e2e8f0;
}

@keyframes tm-pulse-card {
  0% {
    box-shadow: 0 0 0px rgba(239, 68, 68, 0.2);
  }
  100% {
    box-shadow: 0 0 24px rgba(239, 68, 68, 0.65);
  }
}

@keyframes tm-flash {
  0% { opacity: 0.92; }
  100% { opacity: 1; }
}

.tm-pulse-danger {
  border-color: #ef4444 !important;
  animation: tm-pulse-card 1s infinite alternate;
}
</style>

