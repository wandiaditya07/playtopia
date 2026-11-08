<template>
  <aside
    class="pt-sidebar d-print-none"
    :class="{ collapsed }"
    @mouseenter="$emit('mouseenter-sidebar')"
    @mouseleave="onMouseLeave"
  >
    <!-- Brand Logo Header (Full Playtopia when expanded, P+T when minimized) -->
    <div class="pt-sidebar-brand">
      <router-link
        to="/app/dashboard"
        class="pt-brand-link d-flex align-items-center justify-content-center text-decoration-none"
      >
        <div v-if="collapsed" class="pt-logo-mini" title="Playtopia">
          <img :src="PlaytopiaP" alt="P" class="pt-char-p" />
          <img :src="PlaytopiaT" alt="T" class="pt-char-t" />
        </div>
        <img v-else :src="PlaytopiaLogo" alt="Playtopia" class="pt-logo-img" />
      </router-link>
    </div>

    <!-- Clean Minimal User & Role Info -->
    <div v-if="!collapsed" class="pt-user-card mx-3 mt-3 px-3 py-2 rounded-3">
      <div class="d-flex align-items-center gap-2">
        <div class="pt-user-avatar">
          {{ (auth.user?.name || 'A').charAt(0).toUpperCase() }}
        </div>
        <div class="lh-sm overflow-hidden flex-grow-1">
          <div class="fw-semibold text-dark text-truncate" style="font-size: 13px;">
            {{ auth.user?.name || 'Petugas' }}
          </div>
          <div class="text-muted text-truncate" style="font-size: 11px;">
            {{ auth.user?.role || 'Staff' }} &middot; Outlet #{{ auth.user?.outlet_id || 1 }}
          </div>
        </div>
      </div>
    </div>

    <!-- Grouped Navigation Menus -->
    <nav class="pt-sidebar-nav flex-grow-1 overflow-y-auto overflow-x-hidden px-2 py-3">
      <div
        v-for="group in displayGroups"
        :key="group.code"
        class="pt-nav-group"
        :class="collapsed ? 'mb-1' : 'mb-3'"
      >
        <!-- Group Header -->
        <button
          v-if="group.is_group && !collapsed"
          type="button"
          class="pt-group-header w-100 d-flex align-items-center justify-content-between px-2 py-1 border-0 bg-transparent"
          @click="toggleGroup(group.code)"
        >
          <span class="text-truncate">{{ groupLabelId(group.code, group.label) }}</span>
          <svg
            class="pt-chevron"
            :class="{ rotated: !isGroupOpen(group.code) }"
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

        <!-- Group Items -->
        <ul
          v-show="!group.is_group || collapsed || isGroupOpen(group.code)"
          class="list-unstyled mb-0 mt-1"
        >
          <li v-for="item in group.items" :key="item.code" class="mb-1">
            <router-link
              :to="item.path"
              class="pt-nav-item d-flex align-items-center rounded-2 text-decoration-none"
              :class="{ active: isActiveRoute(item.path), 'justify-content-center px-0': collapsed, 'gap-2 px-2': !collapsed }"
              :title="itemLabelId(item.code, item.label)"
              @click="onNavClick"
            >
              <span class="pt-item-icon" v-html="getMenuSvg(item.code)" />
              <span v-if="!collapsed" class="pt-item-label flex-grow-1 text-truncate">
                {{ itemLabelId(item.code, item.label) }}
              </span>
            </router-link>
          </li>
        </ul>
      </div>
    </nav>

    <!-- Bottom Status Footer -->
    <div v-if="!collapsed" class="pt-sidebar-footer px-3 py-2 border-top">
      <div class="d-flex align-items-center justify-content-between" style="font-size: 11.5px; color: #64748b;">
        <span>Playtopia POS v2.0</span>
        <span class="d-inline-flex align-items-center gap-1 text-success fw-medium">
          <span class="pt-status-dot" /> Terhubung
        </span>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { reactive, computed } from 'vue'
import { useRoute } from 'vue-router'
import { usePosAuthStore } from '@/stores/posAuth'
import PlaytopiaLogo from '@/assets/playtopia-logo.png'
import PlaytopiaP from '@/assets/playtopia-p.png'
import PlaytopiaT from '@/assets/playtopia-t.png'

defineProps({
  collapsed: { type: Boolean, default: false }
})
const emit = defineEmits(['close-mobile', 'mouseenter-sidebar', 'mouseleave-sidebar'])

const route = useRoute()
const auth = usePosAuthStore()
const closedGroups = reactive({})

function onMouseLeave(e) {
  // Blur any focused link inside sidebar so focus ring never sticks when minimized
  if (e.currentTarget && e.currentTarget.contains(document.activeElement)) {
    document.activeElement.blur()
  }
  emit('mouseleave-sidebar')
}

function onNavClick(e) {
  if (e.currentTarget) e.currentTarget.blur()
  emit('close-mobile')
}

const DEFAULT_GROUPS = [
  {
    code: 'dashboard',
    label: 'Dashboard',
    is_group: false,
    items: [{ code: 'dashboard', label: 'Dashboard', path: '/app/dashboard' }]
  },
  {
    code: 'grp_pos',
    label: 'Point of Sale',
    is_group: true,
    items: [
      { code: 'pos_cashier', label: 'Kasir POS', path: '/app/pos' },
      { code: 'orders', label: 'Daftar Transaksi', path: '/app/orders' },
      { code: 'shifts', label: 'Shift & Kas Laci', path: '/app/closing' }
    ]
  },
  {
    code: 'grp_access',
    label: 'Access Control',
    is_group: true,
    items: [
      { code: 'access_scan', label: 'Simulator Gate', path: '/app/simulator' },
      { code: 'tickets', label: 'Monitoring Pengunjung', path: '/app/visitors' },
      { code: 'access_logs', label: 'Riwayat Scan Gate', path: '/app/access/logs' }
    ]
  }
]

const displayGroups = computed(() => {
  return auth.menuGroups && auth.menuGroups.length > 0 ? auth.menuGroups : DEFAULT_GROUPS
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

function groupLabelId(code, fallback) {
  const map = {
    grp_pos: 'Point of Sale',
    grp_access: 'Access & Gate',
    grp_members: 'Member & Promo',
    grp_booking: 'Booking',
    grp_catalog: 'Katalog',
    grp_reports: 'Laporan',
    grp_system: 'Sistem & Akses'
  }
  return map[code] || fallback
}

function itemLabelId(code, fallback) {
  const map = {
    dashboard: 'Dashboard',
    pos_cashier: 'Kasir POS',
    orders: 'Daftar Transaksi',
    payments: 'Rekap Pembayaran',
    shifts: 'Shift & Kas Laci',
    access_scan: 'Simulator Gate',
    access_logs: 'Riwayat Scan Gate',
    tickets: 'Monitoring Pengunjung',
    gates: 'Perangkat Gate',
    members: 'Data Member',
    member_cards: 'Kartu RFID Member',
    membership_plans: 'Paket Membership',
    vouchers: 'Voucher Diskon',
    bookings: 'Booking Rombongan',
    registrations: 'Registrasi Online',
    products: 'Produk & Paket',
    business_units: 'Unit Bisnis',
    sales_report: 'Laporan Penjualan',
    item_report: 'Penjualan per Item',
    closing: 'Rekap Closing',
    report_schedules: 'Jadwal Laporan',
    backups: 'Backup Database',
    outlets: 'Cabang Outlet',
    users: 'Manajemen Pengguna',
    roles: 'Role & Hak Akses',
    menus: 'Struktur Menu',
    audit_logs: 'Log Audit',
    settings: 'Pengaturan'
  }
  return map[code] || fallback
}

// Clean monochrome stroke SVG icons (16x16)
const ICONS = {
  dashboard: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>',
  pos_cashier: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
  orders: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  payments: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
  shifts: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  access_scan: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>',
  access_logs: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  tickets: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  gates: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>',
  members: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  member_cards: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
  membership_plans: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  vouchers: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  bookings: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  registrations: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
  products: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
  business_units: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  sales_report: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  item_report: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>',
  closing: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  outlets: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  users: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>',
  roles: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  menus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  audit_logs: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  settings: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
}

const DEFAULT_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/></svg>'

function getMenuSvg(code) {
  return ICONS[code] || DEFAULT_SVG
}
</script>

<style scoped>
.pt-sidebar {
  width: 248px;
  flex-shrink: 0;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s ease;
  z-index: 1040;
}

.pt-sidebar.collapsed {
  width: 68px;
}

.pt-sidebar-brand {
  height: 64px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #f1f5f9;
  overflow: hidden;
  flex-shrink: 0;
}

.pt-sidebar.collapsed .pt-sidebar-brand {
  padding: 0 6px;
}

.pt-brand-link {
  width: 100%;
  outline: none !important;
  box-shadow: none !important;
}

.pt-logo-img {
  max-height: 36px;
  max-width: 180px;
  width: auto;
  object-fit: contain;
  display: block;
}

.pt-logo-mini {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 1px;
  height: 34px;
  max-width: 54px;
}

.pt-char-p {
  height: 30px;
  width: auto;
  object-fit: contain;
  display: block;
}

.pt-char-t {
  height: 29px;
  width: auto;
  object-fit: contain;
  display: block;
  margin-left: -2px;
}

.pt-user-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.pt-user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: #0284c7;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pt-group-header {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #94a3b8;
  text-transform: uppercase;
  cursor: pointer;
  outline: none !important;
}

.pt-group-header:hover {
  color: #475569;
}

.pt-chevron {
  color: #94a3b8;
  transition: transform 0.18s ease;
  flex-shrink: 0;
}

.pt-chevron.rotated {
  transform: rotate(-90deg);
}

.pt-nav-item {
  color: #475569;
  font-size: 13.5px;
  font-weight: 500;
  min-height: 38px;
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.pt-sidebar.collapsed .pt-nav-item {
  width: 42px;
  height: 40px;
  margin: 0 auto;
}

.pt-nav-item:hover {
  background-color: #f1f5f9;
  color: #0f172a;
}

.pt-nav-item:focus,
.pt-nav-item:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}

.pt-nav-item.active {
  background-color: #e0f2fe;
  color: #0284c7 !important;
  font-weight: 600;
}

.pt-item-icon {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: currentColor;
  opacity: 0.85;
}

.pt-nav-item.active .pt-item-icon {
  opacity: 1;
}

.pt-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #10b981;
  display: inline-block;
}

@media (max-width: 991.98px) {
  .pt-sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    width: 248px !important;
    transform: translateX(-100%);
    box-shadow: 8px 0 24px rgba(15, 23, 42, 0.08);
  }
  .pt-mobile-open .pt-sidebar {
    transform: translateX(0);
  }
}
</style>
