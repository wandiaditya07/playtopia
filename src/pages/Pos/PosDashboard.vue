<template>
  <div class="pos-dashboard-page">
    <!-- Top Welcome & Quick Actions Banner -->
    <div class="pt-welcome-banner rounded-4 p-4 mb-4 text-white shadow-sm d-flex flex-wrap justify-content-between align-items-center gap-3">
      <div>
        <div class="d-flex align-items-center gap-2 mb-1">
          <span class="badge bg-white text-primary fw-bold px-3 py-1 rounded-pill">
            👑 Role: {{ auth.roleLabel }}
          </span>
          <span class="badge bg-warning text-dark fw-bold px-3 py-1 rounded-pill">
            📍 Playtopia Senayan Park
          </span>
        </div>
        <h3 class="fw-bold mb-1 text-white">
          Halo, {{ auth.user?.name || 'Admin Playtopia' }}! 👋
        </h3>
        <p class="mb-0 text-white-50">
          Pantau performa omset Playground &amp; Cafe, trafik pengunjung turnstile, dan kontrol akses per grup menu secara real-time.
        </p>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <router-link to="/app/pos" class="btn btn-light fw-bold text-primary shadow-sm">
          🛒 Buka Kasir POS
        </router-link>
        <router-link
          v-if="auth.isAdmin"
          to="/app/system/roles"
          class="btn btn-warning fw-bold text-dark shadow-sm"
        >
          🛡️ Atur Hak Akses Role &amp; Menu
        </router-link>
        <button
          type="button"
          class="btn btn-outline-light fw-bold"
          :disabled="loading"
          @click="loadDashboard"
        >
          {{ loading ? 'Memuat...' : '🔄 Refresh' }}
        </button>
      </div>
    </div>

    <div v-if="errorMsg" class="alert alert-danger d-flex justify-content-between align-items-center">
      <span>{{ errorMsg }}</span>
      <button class="btn btn-sm btn-danger" @click="loadDashboard">Coba Lagi</button>
    </div>

    <!-- KPI Cards -->
    <div class="row g-3 mb-4">
      <div class="col-sm-6 col-xl-3">
        <div class="pt-kpi-card pt-kpi-sky h-100">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <div class="small text-uppercase fw-bold opacity-75">Total Omset Hari Ini</div>
              <div class="fs-3 fw-bold mt-1">{{ rupiah(kpis.revenue_today || 0) }}</div>
              <div class="small mt-1 opacity-90">{{ kpis.orders_today || 0 }} transaksi selesai</div>
            </div>
            <span class="pt-kpi-icon">💰</span>
          </div>
        </div>
      </div>

      <div class="col-sm-6 col-xl-3">
        <div class="pt-kpi-card pt-kpi-pink h-100">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <div class="small text-uppercase fw-bold opacity-75">Anak di Playground</div>
              <div class="fs-3 fw-bold mt-1">{{ kpis.active_visitors || 0 }} Anak</div>
              <div class="small mt-1 opacity-90">
                Overtime: <strong>{{ kpis.overtime_visitors || 0 }} anak</strong>
              </div>
            </div>
            <span class="pt-kpi-icon">🎡</span>
          </div>
        </div>
      </div>

      <div class="col-sm-6 col-xl-3">
        <div class="pt-kpi-card pt-kpi-mint h-100">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <div class="small text-uppercase fw-bold opacity-75">Member &amp; Kartu RFID</div>
              <div class="fs-3 fw-bold mt-1">{{ kpis.total_members || 0 }} Member</div>
              <div class="small mt-1 opacity-90">Saldo aktif: {{ rupiah(kpis.total_member_balance || 0) }}</div>
            </div>
            <span class="pt-kpi-icon">💳</span>
          </div>
        </div>
      </div>

      <div class="col-sm-6 col-xl-3">
        <div class="pt-kpi-card pt-kpi-amber h-100">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <div class="small text-uppercase fw-bold opacity-75">Akses Role &amp; Menu</div>
              <div class="fs-3 fw-bold mt-1">{{ auth.menuGroups.length }} Grup Menu</div>
              <div class="small mt-1 opacity-90">Total {{ totalSubmenus }} modul aktif</div>
            </div>
            <span class="pt-kpi-icon">🛡️</span>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-3 mb-4">
      <!-- Breakdown Omset per Business Unit -->
      <div class="col-lg-5">
        <div class="card h-100">
          <div class="card-header card-header-sky py-3 d-flex justify-content-between align-items-center">
            <span class="fw-bold">📊 Kontribusi Omset per Unit Bisnis</span>
            <span class="badge bg-white text-primary">Real-time MySQL</span>
          </div>
          <div class="card-body">
            <div v-if="revenueByUnit.length === 0" class="text-center text-muted py-4">
              Belum ada data unit bisnis.
            </div>
            <div
              v-for="u in revenueByUnit"
              :key="u.code"
              class="mb-3 p-3 rounded-3 border bg-light"
            >
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="fw-bold text-dark">
                  {{ u.code === 'PLAYGROUND' ? '🎡' : u.code === 'CAFE' ? '☕' : '🧦' }} {{ u.name }}
                </span>
                <strong class="text-primary">{{ rupiah(u.revenue) }}</strong>
              </div>
              <div class="progress" style="height: 10px;">
                <div
                  class="progress-bar"
                  :class="u.code === 'PLAYGROUND' ? 'bg-info' : u.code === 'CAFE' ? 'bg-danger' : 'bg-warning'"
                  :style="{ width: unitPercentage(u.revenue) + '%' }"
                />
              </div>
              <div class="d-flex justify-content-between small text-muted mt-1">
                <span>{{ u.qty_sold }} item terjual</span>
                <span>{{ unitPercentage(u.revenue) }}% dari omset</span>
              </div>
            </div>

            <!-- Shortcut Menu Groups -->
            <div class="mt-3 pt-3 border-top">
              <div class="small fw-bold text-uppercase text-muted mb-2">Akses Cepat Grup Menu Anda:</div>
              <div class="d-flex flex-wrap gap-2">
                <router-link to="/app/pos" class="btn btn-sm btn-play-sky">🛒 Kasir POS</router-link>
                <router-link to="/app/visitors" class="btn btn-sm btn-play-pink">🧒 Pengunjung Aktif</router-link>
                <router-link to="/app/simulator" class="btn btn-sm btn-play-amber">🚧 Simulator Gate</router-link>
                <router-link to="/app/members" class="btn btn-sm btn-play-mint">💳 Member &amp; Topup</router-link>
                <router-link to="/app/products" class="btn btn-sm btn-outline-primary">📦 Katalog Produk</router-link>
                <router-link to="/app/system/roles" class="btn btn-sm btn-outline-primary">🛡️ Role &amp; Permission</router-link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Transaksi Terakhir -->
      <div class="col-lg-7">
        <div class="card h-100">
          <div class="card-header card-header-pink py-3 d-flex justify-content-between align-items-center">
            <span class="fw-bold">🧾 Transaksi Kasir Terbaru</span>
            <router-link to="/app/orders" class="btn btn-sm btn-light fw-bold text-danger">
              Lihat Semua →
            </router-link>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>No. Invoice</th>
                    <th>Kasir</th>
                    <th>Metode</th>
                    <th>Total</th>
                    <th>Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="recentOrders.length === 0">
                    <td colspan="5" class="text-center text-muted py-4">Belum ada transaksi tercatat.</td>
                  </tr>
                  <tr v-for="o in recentOrders" :key="o.id">
                    <td>
                      <strong class="font-monospace text-primary">{{ o.order_number }}</strong>
                      <div v-if="o.member_name" class="small text-success">⭐ {{ o.member_name }}</div>
                    </td>
                    <td>{{ o.cashier_name || 'Kasir' }}</td>
                    <td>
                      <span class="badge badge-play-sky">{{ (o.payment_method || 'CASH').toUpperCase() }}</span>
                    </td>
                    <td class="fw-bold text-dark">{{ rupiah(o.total) }}</td>
                    <td class="small text-muted">{{ fmtDateTime(o.created_at) }}</td>
                  </tr>
                </tbody>
              </table>
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
import { rupiah, fmtDateTime } from '@/utils/format'
import { usePosAuthStore } from '@/stores/posAuth'

const auth = usePosAuthStore()

const loading = ref(false)
const errorMsg = ref('')
const kpis = ref({})
const revenueByUnit = ref([])
const recentOrders = ref([])

const totalSubmenus = computed(() =>
  auth.menuGroups.reduce((acc, g) => acc + (g.items?.length || g.children?.length || 0), 0)
)

const totalUnitRev = computed(() =>
  revenueByUnit.value.reduce((acc, u) => acc + Number(u.revenue || 0), 0)
)

function unitPercentage(rev) {
  if (!totalUnitRev.value) return 0
  return Math.round((Number(rev || 0) / totalUnitRev.value) * 100)
}

async function loadDashboard() {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await api('/admin/dashboard')
    if (res.success && res.data) {
      kpis.value = res.data.kpis || {}
      revenueByUnit.value = res.data.revenue_by_unit || []
      recentOrders.value = res.data.recent_orders || []
    }
  } catch (err) {
    errorMsg.value = err.message || 'Gagal memuat data dashboard.'
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboard)
</script>

<style scoped>
.pt-welcome-banner {
  background: linear-gradient(125deg, #00729c 0%, #00a8e8 50%, #ff4da6 100%);
}
</style>
