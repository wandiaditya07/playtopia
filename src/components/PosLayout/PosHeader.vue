<template>
  <header class="pt-header d-print-none">
    <div class="d-flex align-items-center gap-3">
      <!-- Mobile drawer button (only visible on tablet/mobile where hover is unavailable) -->
      <button
        type="button"
        class="pt-mobile-trigger d-lg-none"
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
        class="pt-session-pill d-none d-sm-inline-flex align-items-center gap-1 rounded-2"
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
        class="pt-customer-screen-btn d-none d-xl-inline-flex align-items-center gap-1 text-decoration-none"
      >
        <span>Layar Pelanggan</span>
      </a>

      <!-- User Profile Dropdown (Pure Vue state to prevent legacy Bootstrap .btn/.show layout distortion) -->
      <div ref="dropdownRef" class="pt-user-dropdown">
        <button
          type="button"
          class="pt-user-trigger"
          :class="{ active: userMenuOpen }"
          @click.stop="userMenuOpen = !userMenuOpen"
        >
          <span class="pt-avatar">
            {{ firstLetter }}
          </span>
          <span class="pt-user-meta d-none d-md-flex">
            <span class="pt-user-name">{{ auth.user?.name || 'Petugas' }}</span>
            <span class="pt-user-role">{{ auth.user?.role || 'Staff' }}</span>
          </span>
          <svg
            class="pt-user-chevron d-none d-md-block"
            :class="{ rotated: userMenuOpen }"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <div v-if="userMenuOpen" class="pt-user-menu">
          <div class="pt-user-menu-head">
            <div class="fw-semibold text-dark" style="font-size: 13px;">{{ auth.user?.name }}</div>
            <div class="text-muted" style="font-size: 11.5px;">{{ auth.user?.email }}</div>
            <div class="text-muted mt-1" style="font-size: 11px;">
              Role: <strong class="text-dark">{{ auth.user?.role }}</strong>
            </div>
          </div>

          <template v-if="auth.user?.role === 'Admin' || Number(auth.user?.role_id) === 2">
            <router-link
              class="pt-user-menu-item"
              to="/app/system/roles"
              @click="userMenuOpen = false"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Role &amp; Hak Akses Menu</span>
            </router-link>
            <router-link
              class="pt-user-menu-item"
              to="/app/system/users"
              @click="userMenuOpen = false"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              </svg>
              <span>Manajemen Pengguna</span>
            </router-link>
            <div class="pt-user-menu-divider" />
          </template>

          <button
            class="pt-user-menu-item danger"
            type="button"
            :disabled="loggingOut"
            @click="logout"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>{{ loggingOut ? 'Keluar...' : 'Keluar (Log Out)' }}</span>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { usePosAuthStore } from '@/stores/posAuth'
import { fmtCountdown, fmtDateTime } from '@/utils/format'

defineProps({
  collapsed: { type: Boolean, default: false }
})
defineEmits(['toggle-mobile'])

const route = useRoute()
const auth = usePosAuthStore()
const loggingOut = ref(false)
const userMenuOpen = ref(false)
const dropdownRef = ref(null)

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

function handleOutsideClick(e) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    userMenuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick)
})

function logout() {
  loggingOut.value = true
  userMenuOpen.value = false
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

.pt-mobile-trigger {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.pt-session-pill {
  font-size: 12px;
  padding: 5px 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #334155;
}

.pt-session-pill.session-danger {
  border-color: #fecdd3;
  background: #fff1f2;
  color: #e11d48;
}

.pt-customer-screen-btn {
  font-size: 12.5px;
  font-weight: 500;
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #0284c7;
  transition: all 0.15s ease;
}

.pt-customer-screen-btn:hover {
  background: #f0f9ff;
  border-color: #7dd3fc;
  color: #0369a1;
}

.pt-user-dropdown {
  position: relative;
}

.pt-user-trigger {
  display: inline-flex !important;
  flex-direction: row !important;
  align-items: center !important;
  gap: 9px;
  height: 38px;
  padding: 4px 10px 4px 6px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.pt-user-trigger:hover,
.pt-user-trigger.active {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.pt-avatar {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #0284c7;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}

.pt-user-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  line-height: 1.15;
  text-align: left;
}

.pt-user-name {
  font-size: 12.5px;
  font-weight: 600;
  color: #0f172a;
}

.pt-user-role {
  font-size: 10.5px;
  color: #64748b;
}

.pt-user-chevron {
  color: #64748b;
  transition: transform 0.15s ease;
  flex-shrink: 0;
}

.pt-user-chevron.rotated {
  transform: rotate(180deg);
}

.pt-user-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 230px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 6px;
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.12);
  z-index: 1050;
}

.pt-user-menu-head {
  padding: 8px 10px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 7px;
  margin-bottom: 4px;
}

.pt-user-menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 500;
  color: #334155;
  text-decoration: none;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}

.pt-user-menu-item:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.pt-user-menu-item.danger {
  color: #dc2626;
  font-weight: 600;
}

.pt-user-menu-item.danger:hover {
  background: #fef2f2;
  color: #b91c1c;
}

.pt-user-menu-divider {
  height: 1px;
  background: #f1f5f9;
  margin: 4px 0;
}
</style>
