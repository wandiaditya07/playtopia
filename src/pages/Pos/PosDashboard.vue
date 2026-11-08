<template>
  <div class="pos-dashboard-page">
    <!-- Top Welcome & Quick Actions Banner -->
    <div class="pt-welcome-banner rounded-3 p-4 mb-4 text-white shadow-sm d-flex flex-wrap justify-content-between align-items-center gap-3">
      <div>
        <div class="d-flex align-items-center gap-2 mb-1">
          <span class="badge bg-white text-primary fw-semibold px-2.5 py-1 rounded-pill">
            Role: {{ auth.roleLabel }}
          </span>
          <span class="badge bg-white bg-opacity-25 text-white fw-medium px-2.5 py-1 rounded-pill">
            Playtopia Senayan Park
          </span>
        </div>
        <h4 class="fw-bold mb-1 text-white">
          Selamat Datang, {{ auth.user?.name || 'Admin Playtopia' }}
        </h4>
        <p class="mb-0 text-white-50 small">
          Ringkasan performa operasional Playground &amp; Cafe, pengunjung aktif, dan akses grup menu.
        </p>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <router-link to="/app/pos" class="btn btn-light btn-sm fw-semibold text-primary">
          Buka Kasir POS
        </router-link>
        <router-link
          v-if="auth.isAdmin"
          to="/app/system/roles"
          class="btn btn-outline-light btn-sm fw-semibold"
        >
          Hak Akses Role &amp; Menu
        </router-link>
        <button
          type="button"
          class="btn btn-outline-light btn-sm fw-semibold"
          :disabled="loading"
          @click="loadDashboard"
        >
          {{ loading ? 'Memuat...' : 'Refresh' }}
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
        <div class="card p-3 h-100 border-start border-4 border-info">
          <div class="small text-uppercase text-muted fw-semibold">Total Omset Hari Ini</div>
          <div class="fs-4 fw-bold text-dark mt-1">{{ rupiah(kpis.revenue_today || 0) }}</div>
          <div class="small text-muted mt-1">{{ kpis.orders_today || 0 }} transaksi selesai</div>
        </div>
      </div>

      <div class="col-sm-6 col-xl-3">
        <div class="card p-3 h-100 border-start border-4 border-primary">
          <div class="small text-uppercase text-muted fw-semibold">Anak di Playground</div>
          <div class="fs-4 fw-bold text-dark mt-1">{{ kpis.active_visitors || 0 }} Anak</div>
          <div class="small text-muted mt-1">
            Overtime: <strong class="text-danger">{{ kpis.overtime_visitors || 0 }} anak</strong>
          </div>
        </div>
      </div>

      <div class="col-sm-6 col-xl-3">
        <div class="card p-3 h-100 border-start border-4 border-success">
          <div class="small text-uppercase text-muted fw-semibold">Member &amp; Kartu RFID</div>
          <div class="fs-4 fw-bold text-dark mt-1">{{ kpis.total_members || 0 }} Member</div>
          <div class="small text-muted mt-1">Total saldo: {{ rupiah(kpis.total_member_balance || 0) }}</div>
        </div>
      </div>

      <div class="col-sm-6 col-xl-3">
        <div class="card p-3 h-100 border-start border-4 border-warning">
          <div class="small text-uppercase text-muted fw-semibold">Akses Role &amp; Menu</div>
          <div class="fs-4 fw-bold text-dark mt-1">{{ auth.menuGroups.length }} Grup Menu</div>
          <div class="small text-muted mt-1">{{ totalSubmenus }} modul aktif</div>
        </div>
      </div>
    </div>

    <div class="row g-3 mb-4">
      <!-- Breakdown Omset per Business Unit -->
      <div class="col-lg-5">
        <div class="card h-100">
          <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center border-bottom">
            <span class="fw-semibold text-dark">Kontribusi Omset per Unit Bisnis</span>
            <span class="badge badge-play-sky">Real-time</span>
          </div>
          <div class="card-body">
            <div v-if="revenueByUnit.length === 0" class="text-center text-muted py-4">
              Belum ada data unit bisnis.
            </div>
            <div
              v-for="u in revenueByUnit"
              :key="u.code"
              class="mb-3 p-3 rounded-2 border bg-light"
            >
              <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="fw-semibold text-dark">{{ u.name }}</span>
                <strong class="text-primary">{{ rupiah(u.revenue) }}</strong>
              </div>
              <div class="progress" style="height: 8px;">
                <div
                  class="progress-bar"
                  :class="u.code === 'PLAYGROUND' ? 'bg-info' : u.code === 'CAFE' ? 'bg-primary' : 'bg-warning'"
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
              <div class="small fw-semibold text-uppercase text-muted mb-2">Navigasi Cepat</div>
              <div class="d-flex flex-wrap gap-2">
                <router-link to="/app/pos" class="btn btn-sm btn-outline-primary">Kasir POS</router-link>
                <router-link to="/app/visitors" class="btn btn-sm btn-outline-primary">Pengunjung Aktif</router-link>
                <router-link to="/app/simulator" class="btn btn-sm btn-outline-primary">Simulator Gate</router-link>
                <router-link to="/app/members" class="btn btn-sm btn-outline-primary">Data Member</router-link>
                <router-link to="/app/products" class="btn btn-sm btn-outline-primary">Katalog Produk</router-link>
                <router-link to="/app/system/roles" class="btn btn-sm btn-outline-primary">Role &amp; Akses</router-link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Transaksi Terakhir -->
      <div class="col-lg-7">
        <div class="card h-100">
          <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center border-bottom">
            <span class="fw-semibold text-dark">Transaksi Kasir Terbaru</span>
            <router-link to="/app/orders" class="btn btn-sm btn-outline-primary">
              Lihat Semua
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
                      <div v-if="o.member_name" class="small text-success">{{ o.member_name }}</div>
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
  background: linear-gradient(125deg, #0284c7 0%, #0369a1 100%);
}
</style>
