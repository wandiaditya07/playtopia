<template>
  <aside class="pt-sidebar d-print-none" :class="{ collapsed }">
    <!-- Brand Logo Header -->
    <div class="pt-sidebar-brand">
      <router-link to="/app/dashboard" class="d-flex align-items-center gap-2 text-decoration-none">
        <img :src="PlaytopiaLogo" alt="Playtopia" class="pt-logo-img" />
      </router-link>
    </div>

    <!-- Active Role Card -->
    <div v-if="!collapsed" class="pt-role-banner mx-3 mt-3 p-2 rounded-3" :class="roleThemeClass">
      <div class="d-flex align-items-center gap-2">
        <span class="pt-role-icon">{{ roleIcon }}</span>
        <div class="lh-sm overflow-hidden">
          <div class="fw-bold text-truncate" style="font-size: 13px;">{{ auth.user?.name || 'Petugas' }}</div>
          <div class="d-flex align-items-center gap-1 mt-1">
            <span class="badge rounded-pill" :class="roleBadgeClass" style="font-size: 10px; padding: 3px 8px;">
              ROLE: {{ (auth.user?.role || 'Staff').toUpperCase() }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Grouped Navigation Menus (Database-Driven per Role) -->
    <nav class="pt-sidebar-nav flex-grow-1 overflow-auto px-2 py-3">
      <div
        v-for="group in displayGroups"
        :key="group.code"
        class="pt-nav-group mb-3"
      >
        <!-- Group Header -->
        <button
          v-if="group.is_group && !collapsed"
          type="button"
          class="pt-group-header w-100 d-flex align-items-center justify-content-between px-3 py-1 border-0 bg-transparent"
          @click="toggleGroup(group.code)"
        >
          <span class="d-flex align-items-center gap-2">
            <span class="pt-group-dot" :style="{ backgroundColor: groupColor(group.code) }" />
            <span>{{ groupLabelId(group.code, group.label) }}</span>
          </span>
          <span class="pt-chevron" :class="{ rotated: !isGroupOpen(group.code) }">▾</span>
        </button>

        <!-- Group Items -->
        <ul
          v-show="!group.is_group || collapsed || isGroupOpen(group.code)"
          class="list-unstyled mb-0 mt-1"
        >
          <li v-for="item in group.items" :key="item.code" class="mb-1">
            <router-link
              :to="item.path"
              class="pt-nav-item d-flex align-items-center gap-3 px-3 py-2 rounded-3 text-decoration-none"
              :class="{ active: isActiveRoute(item.path) }"
              :title="item.label"
              @click="$emit('close-mobile')"
            >
              <span class="pt-item-icon" :style="isActiveRoute(item.path) ? {} : { backgroundColor: groupBg(group.code), color: groupColor(group.code) }">
                {{ menuEmoji(item.code) }}
              </span>
              <span v-if="!collapsed" class="pt-item-label flex-grow-1 text-truncate">
                {{ itemLabelId(item.code, item.label) }}
              </span>
              <span
                v-if="!collapsed && item.code === 'access_scan'"
                class="badge rounded-pill bg-warning text-dark"
                style="font-size: 10px; padding: 2px 7px;"
              >
                Gate
              </span>
            </router-link>
          </li>
        </ul>
      </div>
    </nav>

    <!-- Bottom Quick Info -->
    <div v-if="!collapsed" class="pt-sidebar-footer p-3 border-top">
      <div class="d-flex align-items-center justify-content-between small text-muted">
        <span>Outlet #{{ auth.user?.outlet_id || 1 }}</span>
        <span class="badge bg-success-subtle text-success border border-success-subtle">MySQL Online</span>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { reactive, computed } from 'vue'
import { useRoute } from 'vue-router'
import { usePosAuthStore } from '@/stores/posAuth'
import PlaytopiaLogo from '@/assets/playtopia-logo.png'

defineProps({
  collapsed: { type: Boolean, default: false }
})
defineEmits(['close-mobile'])

const route = useRoute()
const auth = usePosAuthStore()
const closedGroups = reactive({})

// Fallback jika localStorage lama belum memuat menu_groups
const DEFAULT_GROUPS = [
  {
    code: 'dashboard',
    label: 'Dashboard',
    is_group: false,
    items: [{ code: 'dashboard', label: 'Dashboard Utama', path: '/app/dashboard' }]
  },
  {
    code: 'grp_pos',
    label: 'Point of Sale',
    is_group: true,
    items: [
      { code: 'pos_cashier', label: 'Kasir POS', path: '/app/pos' },
      { code: 'orders', label: 'Riwayat Order', path: '/app/orders' },
      { code: 'shifts', label: 'Closing & Shift', path: '/app/closing' }
    ]
  },
  {
    code: 'grp_access',
    label: 'Access Control',
    is_group: true,
    items: [
      { code: 'access_scan', label: 'Simulator Turnstile', path: '/app/simulator' },
      { code: 'tickets', label: 'Pengunjung Aktif', path: '/app/visitors' },
      { code: 'access_logs', label: 'Log Akses Gate', path: '/app/access/logs' }
    ]
  }
]

const displayGroups = computed(() => {
  return auth.menuGroups && auth.menuGroups.length > 0 ? auth.menuGroups : DEFAULT_GROUPS
})

const roleIcon = computed(() => {
  const r = auth.user?.role
  if (r === 'Admin') return '🛡️'
  if (r === 'Client') return '👑'
  return '🧑‍💻'
})

const roleThemeClass = computed(() => {
  const r = auth.user?.role
  if (r === 'Admin') return 'role-admin'
  if (r === 'Client') return 'role-owner'
  return 'role-staff'
})

const roleBadgeClass = computed(() => {
  const r = auth.user?.role
  if (r === 'Admin') return 'bg-pink text-white'
  if (r === 'Client') return 'bg-warning text-dark'
  return 'bg-info text-dark'
})

function isGroupOpen(code) {
  return !closedGroups[code]
}

function toggleGroup(code) {
  closedGroups[code] = !closedGroups[code]
}

function isActiveRoute(path) {
  return route.path === path
}

function groupColor(code) {
  const map = {
    dashboard: '#0284c7',
    grp_pos: '#0099d6',
    grp_access: '#ec4899',
    grp_members: '#f59e0b',
    grp_booking: '#8b5cf6',
    grp_catalog: '#10b981',
    grp_reports: '#0ea5e9',
    grp_system: '#e11d48'
  }
  return map[code] || '#0284c7'
}

function groupBg(code) {
  const map = {
    dashboard: '#e0f2fe',
    grp_pos: '#e0f7ff',
    grp_access: '#fce7f3',
    grp_members: '#fef3c7',
    grp_booking: '#ede9fe',
    grp_catalog: '#d1fae5',
    grp_reports: '#e0f2fe',
    grp_system: '#ffe4e6'
  }
  return map[code] || '#e0f2fe'
}

function groupLabelId(code, fallback) {
  const map = {
    grp_pos: 'OPERASIONAL POS & KASIR',
    grp_access: 'TURNSTILE & GATE AKSES',
    grp_members: 'MEMBER & PROMO VOUCHER',
    grp_booking: 'BOOKING & REGISTRASI',
    grp_catalog: 'KATALOG PRODUK & PAKET',
    grp_reports: 'LAPORAN & REKONSILIASI',
    grp_system: 'SISTEM & ADMIN RBAC'
  }
  return map[code] || fallback
}

function itemLabelId(code, fallback) {
  const map = {
    dashboard: 'Dashboard Utama',
    pos_cashier: 'Kasir POS',
    orders: 'Daftar Transaksi',
    payments: 'Rekap Pembayaran',
    shifts: 'Shift & Kas Laci',
    access_scan: 'Simulator Gate / Scan',
    access_logs: 'Riwayat Scan Gate',
    tickets: 'Monitoring Pengunjung',
    gates: 'Konfigurasi Gate',
    members: 'Data Member & Top-Up',
    member_cards: 'Kartu RFID Member',
    membership_plans: 'Paket Membership',
    vouchers: 'Voucher Diskon',
    bookings: 'Booking Grup / Ultah',
    registrations: 'Registrasi Online',
    products: 'Produk & Paket Durasi',
    business_units: 'Unit Bisnis Wahana',
    sales_report: 'Laporan Penjualan',
    item_report: 'Penjualan per Item',
    closing: 'Closing Shift Kasir',
    report_schedules: 'Jadwal Email Owner',
    backups: 'Backup Cloud DB',
    outlets: 'Cabang Outlet',
    users: 'Manajemen User & Staff',
    roles: 'Role & Hak Akses Menu',
    menus: 'Pengaturan Group Menu',
    audit_logs: 'Log Audit Aktivitas',
    settings: 'Pengaturan Wahana'
  }
  return map[code] || fallback
}

function menuEmoji(code) {
  const map = {
    dashboard: '📊',
    pos_cashier: '🛒',
    orders: '🧾',
    payments: '💳',
    shifts: '⏱️',
    access_scan: '🚧',
    access_logs: '📋',
    tickets: '👧',
    gates: '⚙️',
    members: '⭐',
    member_cards: '🪪',
    membership_plans: '👑',
    vouchers: '🎟️',
    bookings: '🎂',
    registrations: '📱',
    products: '🎈',
    business_units: '🎠',
    sales_report: '📈',
    item_report: '🍟',
    closing: '🏁',
    report_schedules: '📧',
    backups: '☁️',
    outlets: '🏬',
    users: '👥',
    roles: '🛡️',
    menus: '🗂️',
    audit_logs: '🔍',
    settings: '🔧'
  }
  return map[code] || '🔹'
}
</script>

<style scoped>
.pt-sidebar {
  width: 268px;
  flex-shrink: 0;
  background: #ffffff;
  border-right: 2px solid #e0f2fe;
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 24px rgba(2, 132, 199, 0.06);
  transition: width 0.2s ease, transform 0.2s ease;
  z-index: 1040;
}

.pt-sidebar.collapsed {
  width: 78px;
}

.pt-sidebar-brand {
  height: 68px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
  border-bottom: 2px solid #e0f2fe;
}

.pt-logo-img {
  max-height: 44px;
  width: auto;
  object-fit: contain;
}

.pt-role-banner {
  border: 1px solid #bae6fd;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  color: #0369a1;
}
.pt-role-banner.role-admin {
  border-color: #fbcfe8;
  background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
  color: #9d174d;
}
.pt-role-banner.role-owner {
  border-color: #fde68a;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  color: #92400e;
}

.bg-pink {
  background: linear-gradient(135deg, #ff5cbc 0%, #db2777 100%);
}

.pt-role-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.pt-group-header {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.7px;
  color: #475569;
  text-transform: uppercase;
  cursor: pointer;
}
.pt-group-header:hover {
  color: #0284c7;
}

.pt-group-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}

.pt-chevron {
  font-size: 12px;
  transition: transform 0.2s ease;
}
.pt-chevron.rotated {
  transform: rotate(-90deg);
}

.pt-nav-item {
  color: #334155;
  font-size: 13.5px;
  font-weight: 600;
  transition: all 0.18s ease;
  border: 1px solid transparent;
}

.pt-nav-item:hover {
  background-color: #f0f9ff;
  color: #0284c7;
  border-color: #bae6fd;
  transform: translateX(3px);
}

.pt-nav-item.active {
  background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%);
  color: #ffffff !important;
  font-weight: 700;
  box-shadow: 0 6px 16px rgba(2, 132, 199, 0.28);
}

.pt-item-icon {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.22);
  transition: transform 0.18s ease;
}

.pt-nav-item:hover .pt-item-icon {
  transform: scale(1.08);
}

@media (max-width: 991.98px) {
  .pt-sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    transform: translateX(-100%);
  }
  .pt-mobile-open .pt-sidebar {
    transform: translateX(0);
  }
}
</style>
