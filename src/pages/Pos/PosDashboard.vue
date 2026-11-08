<template>
  <div class="pt-dashboard-page">
    <!-- Top Page Bar -->
    <div class="pt-page-bar d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
      <div>
        <div class="d-flex align-items-center gap-2">
          <h5 class="mb-0 fw-semibold text-dark">Dashboard Operasional</h5>
          <span class="pt-tag">{{ auth.roleLabel }}</span>
        </div>
        <div class="text-muted mt-1" style="font-size: 12.5px;">
          Ringkasan transaksi harian, kunjungan aktif, dan performa unit bisnis Playtopia
        </div>
      </div>

      <div class="d-flex flex-wrap align-items-center gap-2">
        <router-link to="/app/pos" class="pt-btn-outline text-decoration-none">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          <span>Kasir POS</span>
        </router-link>

        <router-link
          v-if="auth.isAdmin"
          to="/app/system/roles"
          class="pt-btn-outline text-decoration-none"
        >
          <span>Role &amp; Akses</span>
        </router-link>

        <button
          type="button"
          class="pt-btn-primary"
          :disabled="loading"
          @click="loadDashboard"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" :class="{ 'pt-spin': loading }">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span>{{ loading ? 'Memuat...' : 'Refresh' }}</span>
        </button>
      </div>
    </div>

    <div v-if="errorMsg" class="pt-alert pt-alert-danger mb-3 d-flex justify-content-between align-items-center">
      <span>{{ errorMsg }}</span>
      <button class="pt-btn-outline" style="padding: 4px 10px; font-size: 12px;" @click="loadDashboard">Coba Lagi</button>
    </div>

    <!-- Clean KPI Cards -->
    <div class="row g-3 mb-3">
      <div class="col-sm-6 col-xl-3">
        <div class="pt-stat-card h-100">
          <div class="text-muted fw-medium" style="font-size: 12px;">Pendapatan Hari Ini</div>
          <div class="pt-stat-val text-dark mt-1">{{ rupiah(kpis.revenue_today || 0) }}</div>
          <div class="text-muted mt-1" style="font-size: 12px;">{{ kpis.orders_today || 0 }} transaksi selesai</div>
        </div>
      </div>

      <div class="col-sm-6 col-xl-3">
        <div class="pt-stat-card h-100">
          <div class="text-muted fw-medium" style="font-size: 12px;">Pengunjung di Area</div>
          <div class="pt-stat-val text-dark mt-1">{{ kpis.active_visitors || 0 }} Anak</div>
          <div class="text-muted mt-1" style="font-size: 12px;">
            Overtime: <strong :class="(kpis.overtime_visitors || 0) > 0 ? 'text-danger' : 'text-dark'">{{ kpis.overtime_visitors || 0 }} anak</strong>
          </div>
        </div>
      </div>

      <div class="col-sm-6 col-xl-3">
        <div class="pt-stat-card h-100">
          <div class="text-muted fw-medium" style="font-size: 12px;">Member Terdaftar</div>
          <div class="pt-stat-val text-dark mt-1">{{ kpis.total_members || 0 }} Member</div>
          <div class="text-muted mt-1" style="font-size: 12px;">Total deposit: {{ rupiah(kpis.total_member_balance || 0) }}</div>
        </div>
      </div>

      <div class="col-sm-6 col-xl-3">
        <div class="pt-stat-card h-100">
          <div class="text-muted fw-medium" style="font-size: 12px;">Modul Akses Aktif</div>
          <div class="pt-stat-val text-dark mt-1">{{ auth.menuGroups.length }} Grup</div>
          <div class="text-muted mt-1" style="font-size: 12px;">{{ totalSubmenus }} menu tersedia</div>
        </div>
      </div>
    </div>

    <div class="row g-3">
      <!-- Breakdown Omset per Business Unit -->
      <div class="col-lg-5">
        <div class="pt-panel h-100">
          <div class="pt-panel-header d-flex justify-content-between align-items-center">
            <span class="fw-semibold text-dark">Kontribusi Pendapatan per Unit</span>
            <span class="pt-tag">{{ revenueByUnit.length }} Unit</span>
          </div>
          <div class="p-3">
            <div v-if="revenueByUnit.length === 0" class="text-center text-muted py-4" style="font-size: 13px;">
              Belum ada data unit bisnis.
            </div>
            <div
              v-for="u in revenueByUnit"
              :key="u.code"
              class="mb-3 p-3 rounded-2 border bg-light"
            >
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="fw-semibold text-dark" style="font-size: 13.5px;">{{ u.name }}</span>
                <strong class="text-dark" style="font-size: 13.5px;">{{ rupiah(u.revenue) }}</strong>
              </div>
              <div class="progress" style="height: 6px; background: #e2e8f0;">
                <div
                  class="progress-bar"
                  style="background-color: #0284c7;"
                  :style="{ width: unitPercentage(u.revenue) + '%' }"
                />
              </div>
              <div class="d-flex justify-content-between text-muted mt-2" style="font-size: 11.5px;">
                <span>{{ u.qty_sold }} item terjual</span>
                <span>{{ unitPercentage(u.revenue) }}%</span>
              </div>
            </div>

            <div class="mt-3 pt-3 border-top">
              <div class="text-muted fw-semibold mb-2" style="font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.03em;">
                Akses Cepat
              </div>
              <div class="d-flex flex-wrap gap-2">
                <router-link to="/app/pos" class="pt-btn-outline text-decoration-none" style="padding: 5px 11px; font-size: 12px;">Kasir POS</router-link>
                <router-link to="/app/visitors" class="pt-btn-outline text-decoration-none" style="padding: 5px 11px; font-size: 12px;">Monitoring Pengunjung</router-link>
                <router-link to="/app/simulator" class="pt-btn-outline text-decoration-none" style="padding: 5px 11px; font-size: 12px;">Simulator Gate</router-link>
                <router-link to="/app/members" class="pt-btn-outline text-decoration-none" style="padding: 5px 11px; font-size: 12px;">Data Member</router-link>
                <router-link to="/app/products" class="pt-btn-outline text-decoration-none" style="padding: 5px 11px; font-size: 12px;">Katalog Produk</router-link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Transaksi Terakhir -->
      <div class="col-lg-7">
        <div class="pt-panel h-100">
          <div class="pt-panel-header d-flex justify-content-between align-items-center">
            <span class="fw-semibold text-dark">Transaksi Terbaru</span>
            <router-link to="/app/orders" class="pt-btn-outline text-decoration-none" style="padding: 4px 10px; font-size: 12px;">
              Lihat Semua
            </router-link>
          </div>
          <div class="table-responsive">
            <table class="table pt-table align-middle mb-0">
              <thead>
                <tr>
                  <th>No. Invoice</th>
                  <th>Kasir</th>
                  <th>Metode</th>
                  <th>Total</th>
                  <th class="text-end">Waktu</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="recentOrders.length === 0">
                  <td colspan="5" class="text-center text-muted py-4">Belum ada transaksi tercatat.</td>
                </tr>
                <tr v-for="o in recentOrders" :key="o.id">
                  <td>
                    <div class="font-monospace fw-semibold text-dark">{{ o.order_number }}</div>
                    <div v-if="o.member_name" class="text-muted" style="font-size: 11.5px;">{{ o.member_name }}</div>
                  </td>
                  <td>{{ o.cashier_name || 'Kasir' }}</td>
                  <td>
                    <span class="pt-dir-badge in">{{ (o.payment_method || 'CASH').toUpperCase() }}</span>
                  </td>
                  <td class="fw-semibold text-dark">{{ rupiah(o.total) }}</td>
                  <td class="text-muted text-end" style="font-size: 12px;">{{ fmtDateTime(o.created_at) }}</td>
                </tr>
              </tbody>
            </table>
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
.pt-dashboard-page {
  max-width: 1400px;
}

.pt-page-bar {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px 18px;
}

.pt-stat-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px 18px;
}

.pt-stat-val {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
}

.pt-btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  transition: all 0.15s ease;
}

.pt-btn-outline:hover {
  background: #f8fafc;
  color: #0284c7;
  border-color: #94a3b8;
}

.pt-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 500;
  color: #ffffff;
  background: #0284c7;
  border: 1px solid #0284c7;
  border-radius: 8px;
  transition: all 0.15s ease;
}

.pt-btn-primary:hover:not(:disabled) {
  background: #0369a1;
}

.pt-btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.pt-alert {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
}

.pt-alert-danger {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.pt-panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}

.pt-panel-header {
  padding: 13px 18px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 14px;
}

.pt-tag {
  font-size: 11.5px;
  font-weight: 600;
  color: #475569;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 3px 9px;
  border-radius: 6px;
}

.pt-table th {
  background: #f8fafc;
  font-size: 11.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #64748b;
  border-bottom: 1px solid #e2e8f0;
  padding: 11px 16px;
}

.pt-table td {
  padding: 11px 16px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
}

.pt-dir-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 5px;
}

.pt-dir-badge.in {
  background: #e0f2fe;
  color: #0369a1;
}

@keyframes pt-spin {
  to { transform: rotate(360deg); }
}

.pt-spin {
  animation: pt-spin 0.8s linear infinite;
}
</style>
