<template>
  <header class="pt-header d-print-none">
    <div class="d-flex align-items-center gap-3">
      <!-- Desktop collapse button -->
      <button
        type="button"
        class="btn btn-sm btn-light border d-none d-lg-inline-flex align-items-center justify-content-center"
        style="width: 34px; height: 34px; border-radius: 8px; color: #475569;"
        title="Sembunyikan / Tampilkan Sidebar"
        @click="$emit('toggle-sidebar')"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <!-- Mobile drawer button -->
      <button
        type="button"
        class="btn btn-sm btn-light border d-lg-none d-inline-flex align-items-center justify-content-center"
        style="width: 34px; height: 34px; border-radius: 8px; color: #475569;"
        title="Buka Menu"
        @click="$emit('toggle-mobile')"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <h6 class="m-0 fw-semibold text-dark">{{ pageTitle }}</h6>
    </div>

    <!-- Right Controls -->
    <div class="d-flex align-items-center gap-2 flex-wrap">
      <!-- Session Countdown -->
      <div
        class="pt-session-pill d-none d-sm-inline-flex align-items-center gap-1 px-2.5 py-1 rounded-2"
        :class="auth.isExpiringSoon ? 'session-danger' : 'session-normal'"
        :title="'Sesi JWT berakhir pada: ' + expiresLabel"
      >
        <span class="text-muted">Sesi:</span>
        <strong class="font-monospace">{{ countdown }}</strong>
      </div>

      <!-- Dual Screen Customer Display Button -->
      <a
        href="/customer-display"
        target="_blank"
        class="btn btn-sm btn-outline-primary px-3 py-1 d-none d-xl-inline-flex align-items-center gap-1"
        style="font-size: 12.5px; border-radius: 8px;"
      >
        Layar Pelanggan
      </a>

      <!-- User Profile Dropdown -->
      <div class="dropdown">
        <button
          id="userDropdownBtn"
          class="btn btn-light border d-flex align-items-center gap-2 py-1 px-2"
          style="border-radius: 8px;"
          type="button"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          <span class="pt-avatar text-white fw-semibold">
            {{ firstLetter }}
          </span>
          <div class="d-none d-md-block text-start lh-1 pe-1">
            <div class="fw-semibold text-dark" style="font-size: 12.5px;">{{ auth.user?.name || 'Petugas' }}</div>
            <small class="text-muted" style="font-size: 10.5px;">{{ auth.user?.role || 'Staff' }}</small>
          </div>
        </button>

        <ul class="dropdown-menu dropdown-menu-end shadow-sm border mt-2 p-2" style="min-width: 220px; border-radius: 10px;">
          <li class="px-3 py-2 bg-light rounded-2 mb-1">
            <div class="fw-semibold text-dark" style="font-size: 13px;">{{ auth.user?.name }}</div>
            <div class="text-muted" style="font-size: 11.5px;">{{ auth.user?.email }}</div>
            <div class="text-muted mt-1" style="font-size: 11px;">
              Role: <strong>{{ auth.user?.role }}</strong>
            </div>
          </li>

          <li v-if="auth.user?.role === 'Admin'">
            <router-link class="dropdown-item rounded-2 py-1.5 small" to="/app/system/roles">
              Role &amp; Hak Akses Menu
            </router-link>
          </li>
          <li v-if="auth.user?.role === 'Admin'">
            <router-link class="dropdown-item rounded-2 py-1.5 small" to="/app/system/users">
              Manajemen Pengguna
            </router-link>
          </li>

          <li><hr class="dropdown-divider my-1"></li>
          <li>
            <button
              class="dropdown-item rounded-2 py-1.5 small text-danger fw-semibold"
              type="button"
              :disabled="loggingOut"
              @click="logout"
            >
              {{ loggingOut ? 'Keluar...' : 'Keluar (Log Out)' }}
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
  height: 64px;
  padding: 0 24px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  position: sticky;
  top: 0;
  z-index: 1020;
}

.pt-session-pill {
  font-size: 12px;
  padding: 4px 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #334155;
}

.pt-session-pill.session-danger {
  border-color: #fecdd3;
  background: #fff1f2;
  color: #e11d48;
}

.pt-avatar {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #0284c7;
  font-size: 13px;
}
</style>
