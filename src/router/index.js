import { createRouter, createWebHistory } from 'vue-router'
import { isSessionValid, getToken } from '@/utils/posSession'

const PosLayout = () => import('@/components/PosLayout/PosLayout.vue')
const PosLogin = () => import('@/pages/Pos/PosLogin.vue')
const ErrorPage = () => import('@/pages/Error/Error.vue')

const routes = [
  { path: '/', redirect: '/app/dashboard' },

  // Publik
  { path: '/login', name: 'PosLogin', component: PosLogin, meta: { guestOnly: true } },
  // Layar pelanggan (dual screen) hanya menerima data lewat BroadcastChannel, tanpa akses API
  {
    path: '/customer-display',
    name: 'CustomerDisplay',
    component: () => import('@/pages/Pos/CustomerDisplay.vue')
  },

  // Aplikasi Playtopia (wajib login JWT & RBAC per Grup Menu)
  {
    path: '/app',
    component: PosLayout,
    meta: { requiresAuth: true },
    redirect: '/app/dashboard',
    children: [
      // 1. Dashboard
      {
        path: 'dashboard',
        name: 'PosDashboard',
        component: () => import('@/pages/Pos/PosDashboard.vue'),
        meta: { title: 'Dashboard Eksekutif & Operasional' }
      },

      // 2. Grup Menu: Point of Sale
      {
        path: 'pos',
        name: 'PosCashier',
        component: () => import('@/pages/Pos/PosCashier.vue'),
        meta: { title: 'Kasir POS Playground & Cafe' }
      },
      {
        path: 'orders',
        name: 'PosOrders',
        component: () => import('@/pages/Pos/OperationsHub.vue'),
        meta: { title: 'Daftar Pesanan & Invoice' }
      },
      {
        path: 'payments',
        name: 'PosPayments',
        component: () => import('@/pages/Pos/OperationsHub.vue'),
        meta: { title: 'Rekonsiliasi Pembayaran' }
      },
      {
        path: 'closing',
        name: 'ClosingShift',
        component: () => import('@/pages/Pos/ClosingShift.vue'),
        meta: { title: 'Shift Kasir & Closing' }
      },

      // 3. Grup Menu: Access Control & Turnstile Gate
      {
        path: 'simulator',
        name: 'HardwareSimulator',
        component: () => import('@/pages/Pos/HardwareSimulator.vue'),
        meta: { title: 'Simulator Hardware & Gate Scan' }
      },
      {
        path: 'visitors',
        name: 'LiveVisitors',
        component: () => import('@/pages/Pos/LiveVisitors.vue'),
        meta: { title: 'Monitoring Pengunjung Aktif' }
      },
      {
        path: 'access/logs',
        name: 'AccessLogs',
        component: () => import('@/pages/Pos/OperationsHub.vue'),
        meta: { title: 'Riwayat Scan Turnstile Gate' }
      },
      {
        path: 'gates',
        name: 'GateDevices',
        component: () => import('@/pages/Pos/OperationsHub.vue'),
        meta: { title: 'Perangkat Turnstile Gate' }
      },

      // 4. Grup Menu: Members & Promo
      {
        path: 'members',
        name: 'MembersList',
        component: () => import('@/pages/Pos/MembersPromo.vue'),
        meta: { title: 'Direktori Member Playtopia' }
      },
      {
        path: 'member-cards',
        name: 'MemberCards',
        component: () => import('@/pages/Pos/MembersPromo.vue'),
        meta: { title: 'Kartu RFID & Wallet Top-Up' }
      },
      {
        path: 'membership-plans',
        name: 'MembershipPlans',
        component: () => import('@/pages/Pos/MembersPromo.vue'),
        meta: { title: 'Paket Membership' }
      },
      {
        path: 'vouchers',
        name: 'PromoVouchers',
        component: () => import('@/pages/Pos/MembersPromo.vue'),
        meta: { title: 'Voucher & Promo Diskon' }
      },

      // 5. Grup Menu: Booking & Reservasi
      {
        path: 'bookings',
        name: 'GroupBookings',
        component: () => import('@/pages/Pos/OperationsHub.vue'),
        meta: { title: 'Booking Rombongan & Ulang Tahun' }
      },
      {
        path: 'registrations',
        name: 'OnlineRegistrations',
        component: () => import('@/pages/Pos/OperationsHub.vue'),
        meta: { title: 'Registrasi Tiket Online' }
      },

      // 6. Grup Menu: Catalog
      {
        path: 'products',
        name: 'CatalogProducts',
        component: () => import('@/pages/Pos/CatalogManager.vue'),
        meta: { title: 'Katalog Produk & Paket Bermain' }
      },
      {
        path: 'business-units',
        name: 'BusinessUnits',
        component: () => import('@/pages/Pos/CatalogManager.vue'),
        meta: { title: 'Unit Bisnis (Playground, Cafe, Retail)' }
      },

      // 7. Grup Menu: Reports
      {
        path: 'reports/:section?',
        name: 'ReportsHub',
        component: () => import('@/pages/Pos/OperationsHub.vue'),
        meta: { title: 'Laporan Analitik & Rekap' }
      },

      // 8. Grup Menu: System & RBAC Admin
      {
        path: 'system/roles',
        name: 'SystemRoles',
        component: () => import('@/pages/Pos/SystemRoles.vue'),
        meta: { title: 'Role & Hak Akses Grup Menu (RBAC)' }
      },
      {
        path: 'system/menus',
        name: 'SystemMenus',
        component: () => import('@/pages/Pos/SystemRoles.vue'),
        meta: { title: 'Struktur Grup Menu' }
      },
      {
        path: 'system/users',
        name: 'SystemUsers',
        component: () => import('@/pages/Pos/SystemUsers.vue'),
        meta: { title: 'Manajemen Pengguna & Role' }
      },
      {
        path: 'system/:section',
        name: 'SystemConfigHub',
        component: () => import('@/pages/Pos/OperationsHub.vue'),
        meta: { title: 'Konfigurasi Sistem & Audit' }
      }
    ]
  },

  { path: '/:pathMatch(.*)*', name: 'Error', component: ErrorPage }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to) => {
  const valid = isSessionValid()

  if (to.matched.some(r => r.meta.requiresAuth) && !valid) {
    return {
      name: 'PosLogin',
      query: { reason: getToken() ? 'expired' : 'unauthorized', redirect: to.fullPath }
    }
  }

  if (to.meta.guestOnly && valid) {
    return { path: '/app/dashboard' }
  }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - Playtopia POS` : 'Playtopia POS'
})

export default router
