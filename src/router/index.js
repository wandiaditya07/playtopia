import { createRouter, createWebHistory } from 'vue-router'
import { isSessionValid, getToken } from '@/utils/posSession'

const PosLayout = () => import('@/components/PosLayout/PosLayout.vue')
const PosLogin = () => import('@/pages/Pos/PosLogin.vue')
const ErrorPage = () => import('@/pages/Error/Error.vue')

const routes = [
  { path: '/', redirect: '/app/pos' },

  // Publik
  { path: '/login', name: 'PosLogin', component: PosLogin, meta: { guestOnly: true } },
  // Layar pelanggan (dual screen) hanya menerima data lewat BroadcastChannel, tanpa akses API
  {
    path: '/customer-display',
    name: 'CustomerDisplay',
    component: () => import('@/pages/Pos/CustomerDisplay.vue')
  },

  // Aplikasi kasir (wajib login JWT)
  {
    path: '/app',
    component: PosLayout,
    meta: { requiresAuth: true },
    redirect: '/app/pos',
    children: [
      { path: 'pos', name: 'PosCashier', component: () => import('@/pages/Pos/PosCashier.vue'), meta: { title: 'Kasir POS' } },
      { path: 'simulator', name: 'HardwareSimulator', component: () => import('@/pages/Pos/HardwareSimulator.vue'), meta: { title: 'Simulator Hardware & Gate' } },
      { path: 'visitors', name: 'LiveVisitors', component: () => import('@/pages/Pos/LiveVisitors.vue'), meta: { title: 'Monitoring Pengunjung' } },
      { path: 'closing', name: 'ClosingShift', component: () => import('@/pages/Pos/ClosingShift.vue'), meta: { title: 'Closing Shift' } }
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
    // Ada token tapi sudah lewat `exp` -> beri tahu user bahwa sesinya berakhir
    return {
      name: 'PosLogin',
      query: { reason: getToken() ? 'expired' : 'unauthorized', redirect: to.fullPath }
    }
  }

  if (to.meta.guestOnly && valid) {
    return { path: '/app/pos' }
  }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - Playtopia POS` : 'Playtopia POS'
})

export default router
