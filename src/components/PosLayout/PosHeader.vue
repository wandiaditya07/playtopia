<template>
  <nav
    class="navbar app-header d-print-none px-3"
    :class="[navbarTypeClass, 'header-' + navbarColorScheme]"
  >
    <div class="d-flex align-items-center">
      <ul class="nav me-2">
        <li class="nav-item">
          <span class="nav-link p-1">
            <a
              href="#"
              class="d-md-down-none px-1"
              aria-label="Toggle sidebar"
              @click.prevent="toggleSidebarMethod"
            >
              <img :src="Menu" alt="menu" width="22">
            </a>
            <a
              href="#"
              class="fs-lg d-md-none"
              aria-label="Buka menu"
              @click.prevent="switchSidebarMethod"
            >
              <img :src="Menu" alt="menu" width="22">
            </a>
          </span>
        </li>
      </ul>

      <div class="d-flex align-items-center gap-2">
        <span class="fw-bold fs-6 text-dark d-none d-sm-inline">{{ pageTitle }}</span>
        <span class="badge bg-play-sky text-dark d-none d-md-inline-block">Playtopia Playground &amp; Cafe</span>
      </div>
    </div>

    <ul class="nav ms-auto align-items-center gap-2">
      <!-- Session Countdown Badge -->
      <li class="nav-item d-none d-sm-block">
        <div
          class="badge py-2 px-3 d-flex align-items-center gap-1 rounded-pill"
          :class="auth.isExpiringSoon ? 'bg-danger text-white' : 'bg-warning text-dark'"
          :title="'Sesi berakhir ' + expiresLabel"
        >
          <span>⏱️ Sisa Sesi:</span>
          <strong>{{ countdown }}</strong>
        </div>
      </li>

      <!-- Customer Display Shortcut -->
      <li class="nav-item d-none d-lg-block">
        <a
          href="/customer-display"
          target="_blank"
          class="btn btn-sm btn-outline-info rounded-pill px-3 fw-semibold"
        >
          🖥️ Layar Pelanggan
        </a>
      </li>

      <!-- User Dropdown -->
      <li class="nav-item dropdown">
        <a
          id="userDropdown"
          class="nav-link dropdown-toggle d-flex align-items-center gap-2 py-1 px-2 rounded"
          href="#"
          role="button"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          <span class="avatar-playtopia rounded-circle text-white fw-bold">
            {{ firstLetter }}
          </span>
          <div class="d-none d-md-block text-start lh-1">
            <div class="fw-bold text-dark fs-sm">{{ auth.user?.name || 'Kasir' }}</div>
            <small class="text-muted text-capitalize fs-xs">{{ auth.user?.role || 'Staff' }}</small>
          </div>
        </a>
        <ul
          class="dropdown-menu dropdown-menu-end shadow-sm border-0 mt-2"
          aria-labelledby="userDropdown"
        >
          <li class="dropdown-item-text small">
            <strong class="text-dark">{{ auth.user?.name }}</strong>
            <div class="text-muted">{{ auth.user?.email }}</div>
            <div class="mt-1 text-muted" style="font-size: 11px;">Sesi aktif hingga {{ expiresLabel }}</div>
          </li>
          <li><hr class="dropdown-divider"></li>
          <li>
            <button
              class="dropdown-item text-danger d-flex align-items-center gap-2"
              type="button"
              :disabled="loggingOut"
              @click="logout"
            >
              <img :src="Cancel" alt="" width="16">
              <span>{{ loggingOut ? 'Keluar...' : 'Log Out Sesi' }}</span>
            </button>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useLayoutStore } from '@/stores/layout'
import { usePosAuthStore } from '@/stores/posAuth'
import { fmtCountdown, fmtDateTime } from '@/utils/format'
import Menu from '@/assets/sidebar/Fill/Menu.svg?url'
import Cancel from '@/assets/sidebar/Outline/Cancel.svg?url'

const route = useRoute()
const layoutStore = useLayoutStore()
const auth = usePosAuthStore()

const loggingOut = ref(false)

const sidebarClose = computed(() => layoutStore.sidebarClose)
const navbarType = computed(() => layoutStore.navbarType)
const navbarColorScheme = computed(() => layoutStore.navbarColorScheme)
const navbarTypeClass = computed(() => 'navbar-' + navbarType.value + '-type')

const pageTitle = computed(() => route.meta?.title || 'Playtopia POS')

const firstLetter = computed(() => {
  const name = auth.user?.name || 'K'
  return name.charAt(0).toUpperCase()
})

const countdown = computed(() => fmtCountdown(auth.remainingSeconds))

const expiresLabel = computed(() => {
  if (!auth.expiresAt) return '-'
  return fmtDateTime(new Date(auth.expiresAt * 1000))
})

function switchSidebarMethod() {
  layoutStore.switchSidebar(true)
}

function toggleSidebarMethod() {
  if (layoutStore.sidebarStatic) {
    layoutStore.toggleSidebar()
    const isClose = layoutStore.sidebarClose
    layoutStore.switchSidebar(isClose)
  } else {
    layoutStore.toggleSidebar()
  }
}

async function logout() {
  loggingOut.value = true
  try {
    auth.logout('manual')
  } finally {
    loggingOut.value = false
  }
}
</script>

<style src="../Header/Header.scss" lang="scss" scoped />

<style scoped>
.avatar-playtopia {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ff5cbc 0%, #5cd2ff 100%);
  font-size: 15px;
  box-shadow: 0 2px 6px rgba(255, 92, 188, 0.35);
}
.fs-sm {
  font-size: 13px;
}
.fs-xs {
  font-size: 11px;
}
</style>
