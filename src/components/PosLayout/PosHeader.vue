<template>
  <header class="pt-header d-print-none">
    <div class="d-flex align-items-center gap-2">
      <!-- Desktop collapse button -->
      <button
        type="button"
        class="btn btn-sm btn-light border d-none d-lg-inline-flex align-items-center justify-content-center"
        style="width: 36px; height: 36px; border-radius: 10px;"
        title="Sembunyikan / Tampilkan Sidebar"
        @click="$emit('toggle-sidebar')"
      >
        ☰
      </button>

      <!-- Mobile drawer button -->
      <button
        type="button"
        class="btn btn-sm btn-light border d-lg-none d-inline-flex align-items-center justify-content-center"
        style="width: 36px; height: 36px; border-radius: 10px;"
        title="Buka Menu"
        @click="$emit('toggle-mobile')"
      >
        ☰
      </button>

      <div class="d-flex align-items-center gap-2 flex-wrap">
        <h5 class="m-0 fw-bold text-dark">{{ pageTitle }}</h5>
        <span class="badge rounded-pill badge-play-sky d-none d-md-inline-block">
          🎡 Playtopia Playground &amp; Cafe
        </span>
      </div>
    </div>

    <!-- Right Controls -->
    <div class="d-flex align-items-center gap-2 flex-wrap">
      <!-- Active Role Pill -->
      <span
        class="badge rounded-pill px-3 py-2 d-none d-md-inline-flex align-items-center gap-1"
        :class="rolePillClass"
      >
        <span>{{ roleIcon }}</span>
        <span>{{ auth.user?.role || 'Staff' }}</span>
      </span>

      <!-- Session Countdown (Fixed NaN -> Real Timer!) -->
      <div
        class="pt-session-pill d-none d-sm-inline-flex align-items-center gap-1 px-3 py-1 rounded-pill"
        :class="auth.isExpiringSoon ? 'session-danger' : 'session-normal'"
        :title="'Sesi JWT berakhir pada: ' + expiresLabel"
      >
        <span>⏱️ Sesi:</span>
        <strong class="font-monospace">{{ countdown }}</strong>
      </div>

      <!-- Dual Screen Customer Display Button -->
      <a
        href="/customer-display"
        target="_blank"
        class="btn btn-sm btn-play-pink rounded-pill px-3 py-1 d-none d-xl-inline-flex align-items-center gap-1"
      >
        <span>🖥️</span>
        <span>Layar Pelanggan</span>
      </a>

      <!-- User Profile Dropdown -->
      <div class="dropdown">
        <button
          id="userDropdownBtn"
          class="btn btn-light border rounded-pill d-flex align-items-center gap-2 py-1 px-2"
          type="button"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          <span class="pt-avatar rounded-circle text-white fw-bold">
            {{ firstLetter }}
          </span>
          <div class="d-none d-md-block text-start lh-1 pe-1">
            <div class="fw-bold text-dark" style="font-size: 12.5px;">{{ auth.user?.name || 'Petugas' }}</div>
            <small class="text-muted" style="font-size: 10.5px;">{{ auth.user?.email }}</small>
          </div>
        </button>

        <ul class="dropdown-menu dropdown-menu-end shadow border-0 mt-2 p-2" style="min-width: 240px; border-radius: 14px;">
          <li class="px-3 py-2 bg-light rounded-3 mb-2">
            <div class="fw-bold text-dark">{{ auth.user?.name }}</div>
            <div class="small text-muted">{{ auth.user?.email }}</div>
            <div class="mt-1">
              <span class="badge bg-primary-subtle text-primary border border-primary-subtle">
                Role: {{ auth.user?.role }}
              </span>
            </div>
            <div class="text-muted mt-1" style="font-size: 11px;">
              Berakhir: {{ expiresLabel }}
            </div>
          </li>

          <li v-if="auth.user?.role === 'Admin'">
            <router-link class="dropdown-item rounded-2 py-2 fw-semibold" to="/app/system/roles">
              🛡️ Atur Role &amp; Hak Akses Menu
            </router-link>
          </li>
          <li v-if="auth.user?.role === 'Admin'">
            <router-link class="dropdown-item rounded-2 py-2 fw-semibold" to="/app/system/users">
              👥 Manajemen User &amp; Staff
            </router-link>
          </li>

          <li><hr class="dropdown-divider my-1"></li>
          <li>
            <button
              class="dropdown-item rounded-2 py-2 text-danger fw-bold d-flex align-items-center gap-2"
              type="button"
              :disabled="loggingOut"
              @click="logout"
            >
              <span>🚪</span>
              <span>{{ loggingOut ? 'Keluar...' : 'Ganti Akun / Log Out' }}</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { usePosAuthStore } from '@/stores/posAuth'
import { fmtCountdown, fmtDateTime } from '@/utils/format'

defineProps({
  collapsed: { type: Boolean, default: false }
})
defineEmits(['toggle-sidebar', 'toggle-mobile'])

const route = useRoute()
const auth = usePosAuthStore()
const loggingOut = ref(false)

const pageTitle = computed(() => route.meta?.title || 'Playtopia POS')

const firstLetter = computed(() => {
  const name = auth.user?.name || 'P'
  return name.charAt(0).toUpperCase()
})

const roleIcon = computed(() => {
  const r = auth.user?.role
  if (r === 'Admin') return '🛡️'
  if (r === 'Client') return '👑'
  return '🧑‍💻'
})

const rolePillClass = computed(() => {
  const r = auth.user?.role
  if (r === 'Admin') return 'badge-play-pink'
  if (r === 'Client') return 'bg-warning-subtle text-warning-emphasis border border-warning'
  return 'badge-play-sky'
})

// Menggunakan remainingMs (milidetik) sehingga tidak pernah NaN!
const countdown = computed(() => fmtCountdown(auth.remainingMs))

const expiresLabel = computed(() => {
  if (!auth.expiresAt) return '-'
  return fmtDateTime(new Date(auth.expiresAt))
})

function logout() {
  loggingOut.value = true
  try {
    auth.logout('manual')
  } finally {
    loggingOut.value = false
  }
}
</script>

<style scoped>
.pt-header {
  height: 68px;
  padding: 0 24px;
  background: #ffffff;
  border-bottom: 2px solid #e0f2fe;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  position: sticky;
  top: 0;
  z-index: 1020;
  box-shadow: 0 2px 12px rgba(2, 132, 199, 0.05);
}

.pt-session-pill {
  font-size: 12.5px;
  border: 1px solid #fde68a;
  background: #fffbeb;
  color: #b45309;
}

.pt-session-pill.session-danger {
  border-color: #fecdd3;
  background: #fff1f2;
  color: #e11d48;
}

.pt-avatar {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #38bdf8 0%, #ec4899 100%);
  font-size: 14px;
}
</style>
