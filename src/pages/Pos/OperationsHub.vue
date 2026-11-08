<template>
  <div class="operations-hub-page">
    <!-- Header Banner -->
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 bg-white p-3 rounded-4 shadow-sm border">
      <div>
        <div class="d-flex align-items-center gap-2">
          <h4 class="mb-0 fw-bold text-dark">{{ currentTitle }}</h4>
          <span class="badge badge-play-sky">Terhubung ke MySQL</span>
        </div>
        <small class="text-muted">{{ currentSubtitle }}</small>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <button
          v-if="section === 'bookings' || section === 'registrations'"
          type="button"
          class="btn btn-sm btn-play-pink fw-bold"
          @click="showBookingModal = true"
        >
          + Buat Booking Rombongan / Ultah
        </button>
        <button
          type="button"
          class="btn btn-sm btn-outline-primary fw-bold"
          :disabled="loading"
          @click="loadAll"
        >
          {{ loading ? 'Memuat...' : '🔄 Refresh Data' }}
        </button>
      </div>
    </div>

    <!-- Section Switcher Pills -->
    <div class="d-flex flex-wrap gap-2 mb-3">
      <router-link
        v-for="nav in navPills"
        :key="nav.path"
        :to="nav.path"
        class="btn btn-sm"
        :class="route.path === nav.path ? 'btn-play-sky' : 'btn-light border text-dark fw-semibold'"
      >
        {{ nav.label }}
      </router-link>
    </div>

    <div v-if="feedback" class="alert alert-dismissible mb-3" :class="'alert-' + feedback.type">
      <span>{{ feedback.text }}</span>
      <button type="button" class="btn-close" @click="feedback = null" />
    </div>

    <!-- 1. ORDERS & PAYMENTS -->
    <div v-if="section === 'orders' || section === 'payments' || section === 'sales'" class="card">
      <div class="card-header card-header-sky py-3 d-flex justify-content-between align-items-center">
        <span class="fw-bold">🧾 Riwayat Order, Pembayaran &amp; Rekap Penjualan</span>
        <span class="badge bg-white text-primary">{{ orders.length }} Transaksi</span>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>No. Invoice</th>
                <th>Waktu</th>
                <th>Kasir</th>
                <th>Member</th>
                <th>Metode Bayar</th>
                <th>Subtotal</th>
                <th>Diskon</th>
                <th>Total Bayar</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="orders.length === 0">
                <td colspan="9" class="text-center text-muted py-4">Belum ada data transaksi.</td>
              </tr>
              <tr v-for="o in orders" :key="o.id">
                <td class="font-monospace fw-bold text-primary">{{ o.order_number }}</td>
                <td class="small">{{ fmtDateTime(o.created_at) }}</td>
                <td>{{ o.cashier_name || 'Kasir' }}</td>
                <td>{{ o.member_name || 'Umum' }}</td>
                <td><span class="badge badge-play-sky">{{ (o.payment_method || 'CASH').toUpperCase() }}</span></td>
                <td>{{ rupiah(o.subtotal) }}</td>
                <td class="text-danger">-{{ rupiah(o.discount_amount) }}</td>
                <td class="fw-bold text-success">{{ rupiah(o.total) }}</td>
                <td><span class="badge bg-success">PAID</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 2. ITEM SALES REPORT -->
    <div v-else-if="section === 'items'" class="card">
      <div class="card-header card-header-pink py-3 d-flex justify-content-between align-items-center">
        <span class="fw-bold">📈 Laporan Penjualan per Item Produk &amp; Paket</span>
        <span class="badge bg-white text-danger">Tabel: order_items</span>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nama Produk / Paket</th>
                <th>Unit Bisnis</th>
                <th>Total Terjual</th>
                <th>Total Omset</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="it in sysData.item_sales" :key="it.id">
                <td class="font-monospace">{{ it.sku }}</td>
                <td class="fw-bold text-dark">{{ it.name }}</td>
                <td><span class="badge badge-play-sky">{{ it.unit_name }}</span></td>
                <td class="fw-bold">{{ it.total_qty }}x</td>
                <td class="fw-bold text-primary">{{ rupiah(it.total_revenue) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 3. ACCESS LOGS & VISITORS REPORT -->
    <div v-else-if="section === 'access_logs' || section === 'visitors_report'" class="card">
      <div class="card-header card-header-violet py-3 d-flex justify-content-between align-items-center">
        <span class="fw-bold">🚶 Log Akses Turnstile Gate &amp; Trafik Kunjungan</span>
        <router-link to="/app/simulator" class="btn btn-sm btn-light fw-bold text-primary">
          ⚡ Buka Simulator Gate
        </router-link>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Waktu Scan</th>
                <th>Arah Gate</th>
                <th>Kode Tiket / Kredensial</th>
                <th>Status Barrier</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in accessLogs" :key="l.id">
                <td class="font-monospace small">{{ fmtDateTime(l.scanned_at) }}</td>
                <td>
                  <span class="badge" :class="String(l.direction).toUpperCase() === 'IN' ? 'bg-success' : 'bg-danger'">
                    {{ String(l.direction).toUpperCase() }}
                  </span>
                </td>
                <td class="font-monospace fw-bold">{{ l.ticket_code || l.credential_value }}</td>
                <td>
                  <span class="badge" :class="l.is_allowed ? 'bg-success' : 'bg-danger'">
                    {{ l.is_allowed ? 'OPEN_GATE' : 'KEEP_LOCKED' }}
                  </span>
                </td>
                <td class="small text-muted">{{ l.deny_reason || 'Akses Valid' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 4. GATES & HARDWARE DEVICES -->
    <div v-else-if="section === 'gates'" class="row g-3">
      <div v-for="g in sysData.gates" :key="g.id" class="col-md-6">
        <div class="card p-4 h-100">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="badge badge-play-sky font-monospace">{{ g.code }}</span>
            <span class="badge bg-success">ONLINE &middot; READY</span>
          </div>
          <h5 class="fw-bold text-dark">{{ g.name }}</h5>
          <p class="small text-muted mb-3">
            Arah: <strong>{{ g.direction.toUpperCase() }}</strong> &middot; Lokasi: {{ g.location || 'Main Entrance' }}
          </p>
          <div class="mt-auto d-flex justify-content-between align-items-center pt-2 border-top">
            <span class="small text-muted">Heartbeat terakhir: {{ g.last_heartbeat_at ? fmtDateTime(g.last_heartbeat_at) : 'Baru saja' }}</span>
            <router-link to="/app/simulator" class="btn btn-sm btn-play-sky">Uji Scan →</router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- 5. BOOKINGS & ONLINE REGISTRATIONS -->
    <div v-else-if="section === 'bookings' || section === 'registrations'" class="card">
      <div class="card-header card-header-pink py-3 d-flex justify-content-between align-items-center">
        <span class="fw-bold">🎂 Reservasi Rombongan, Ulang Tahun &amp; Registrasi Online</span>
        <span class="badge bg-white text-danger">{{ bookings.length }} Jadwal</span>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Kode Booking</th>
                <th>Nama Pemesan</th>
                <th>No. HP</th>
                <th>Tanggal &amp; Jam</th>
                <th>Jumlah Anak</th>
                <th>Total Biaya</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="bookings.length === 0">
                <td colspan="7" class="text-center text-muted py-4">
                  Belum ada jadwal booking rombongan. Klik tombol "+ Buat Booking" di kanan atas.
                </td>
              </tr>
              <tr v-for="b in bookings" :key="b.id">
                <td class="font-monospace fw-bold text-primary">{{ b.booking_code }}</td>
                <td class="fw-bold text-dark">{{ b.customer_name }}</td>
                <td>{{ b.customer_phone }}</td>
                <td>{{ b.booking_date }} ({{ b.start_time }} - {{ b.end_time }})</td>
                <td><span class="badge badge-play-sky">{{ b.guest_count }} Anak</span></td>
                <td class="fw-bold text-primary">{{ rupiah(b.total) }}</td>
                <td><span class="badge bg-success">{{ b.status.toUpperCase() }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 6. OUTLETS & OPERATIONAL SETTINGS -->
    <div v-else-if="section === 'outlets' || section === 'settings'" class="row g-3">
      <div class="col-lg-5">
        <div class="card h-100">
          <div class="card-header card-header-sky py-3">
            <strong class="text-white">🏢 Cabang Outlet Playtopia</strong>
          </div>
          <div class="card-body">
            <div v-for="o in sysData.outlets" :key="o.id" class="p-3 rounded-3 border bg-light mb-2">
              <div class="d-flex justify-content-between">
                <strong class="text-dark">{{ o.name }}</strong>
                <span class="badge badge-play-sky font-monospace">{{ o.code }}</span>
              </div>
              <div class="small text-muted mt-1">{{ o.address }}, {{ o.city }}</div>
              <div class="small text-primary mt-1">📞 {{ o.phone }} &middot; 🕒 {{ o.timezone }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-7">
        <div class="card h-100">
          <div class="card-header card-header-amber py-3 d-flex justify-content-between align-items-center">
            <strong>⚙️ Parameter Operasional Playground &amp; Gate</strong>
            <button type="button" class="btn btn-sm btn-light fw-bold" :disabled="saving" @click="saveSettings">
              💾 Simpan Parameter
            </button>
          </div>
          <div class="card-body">
            <div v-for="(s, idx) in sysData.settings" :key="idx" class="mb-3">
              <label class="form-label small fw-bold text-uppercase text-muted">{{ s.key_name }}</label>
              <input v-model="s.value_jsonStr" type="text" class="form-control font-monospace">
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 7. AUDIT LOGS -->
    <div v-else class="card">
      <div class="card-header card-header-violet py-3">
        <strong>🔍 Audit Log Keamanan &amp; Aktivitas Sistem</strong>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>User</th>
                <th>Aksi</th>
                <th>Entitas</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="sysData.audit_logs.length === 0">
                <td colspan="5" class="text-center text-muted py-4">Belum ada log audit.</td>
              </tr>
              <tr v-for="a in sysData.audit_logs" :key="a.id">
                <td class="small">{{ fmtDateTime(a.created_at) }}</td>
                <td class="fw-bold">{{ a.user_name || 'System' }}</td>
                <td><span class="badge badge-play-sky">{{ a.action }}</span></td>
                <td class="font-monospace small">{{ a.entity_type }} #{{ a.entity_id }}</td>
                <td class="font-monospace small text-muted">{{ a.ip_address || '127.0.0.1' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Booking -->
    <div v-if="showBookingModal" class="pos-backdrop">
      <div class="card pos-dialog" style="max-width: 480px;">
        <div class="card-header card-header-pink py-3 d-flex justify-content-between align-items-center">
          <strong>🎂 Buat Booking Rombongan / Ulang Tahun</strong>
          <button type="button" class="btn-close btn-close-white" @click="showBookingModal = false" />
        </div>
        <div class="card-body">
          <div class="mb-2">
            <label class="form-label small fw-bold">Nama Pemesan / Sekolah / Keluarga</label>
            <input v-model.trim="bookingForm.customer_name" type="text" class="form-control" placeholder="TK Harapan Bangsa / Ibu Siska">
          </div>
          <div class="row g-2 mb-2">
            <div class="col-6">
              <label class="form-label small fw-bold">No. WhatsApp</label>
              <input v-model.trim="bookingForm.customer_phone" type="text" class="form-control" placeholder="0812...">
            </div>
            <div class="col-6">
              <label class="form-label small fw-bold">Tanggal Kunjungan</label>
              <input v-model="bookingForm.booking_date" type="date" class="form-control">
            </div>
          </div>
          <div class="row g-2 mb-3">
            <div class="col-6">
              <label class="form-label small fw-bold">Jumlah Anak</label>
              <input v-model.number="bookingForm.guest_count" type="number" min="5" class="form-control fw-bold">
            </div>
            <div class="col-6">
              <label class="form-label small fw-bold">Total Biaya Paket (Rp)</label>
              <input v-model.number="bookingForm.total" type="number" step="100000" class="form-control fw-bold">
            </div>
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-outline-secondary" @click="showBookingModal = false">Batal</button>
            <button
              type="button"
              class="btn btn-play-pink fw-bold"
              :disabled="!bookingForm.customer_name || !bookingForm.customer_phone || saving"
              @click="createBooking"
            >
              ✓ Simpan Booking
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/utils/posApi'
import { rupiah, fmtDateTime } from '@/utils/format'

const route = useRoute()

const navPills = [
  { path: '/app/orders', label: '🧾 Orders' },
  { path: '/app/payments', label: '💳 Payments' },
  { path: '/app/access/logs', label: '🚶 Access Logs' },
  { path: '/app/gates', label: '🚧 Gate Devices' },
  { path: '/app/bookings', label: '🎂 Group Bookings' },
  { path: '/app/reports/sales', label: '📊 Sales Report' },
  { path: '/app/reports/items', label: '📈 Item Sales' },
  { path: '/app/system/outlets', label: '🏢 Outlets' },
  { path: '/app/system/settings', label: '⚙️ Settings' },
  { path: '/app/system/audit-logs', label: '🔍 Audit Logs' }
]

const section = computed(() => {
  const p = route.path
  if (p.includes('/payments')) return 'payments'
  if (p.includes('/access/logs')) return 'access_logs'
  if (p.includes('/gates')) return 'gates'
  if (p.includes('/bookings')) return 'bookings'
  if (p.includes('/registrations')) return 'registrations'
  if (p.includes('/reports/items')) return 'items'
  if (p.includes('/reports/visitors')) return 'visitors_report'
  if (p.includes('/reports/sales')) return 'sales'
  if (p.includes('/system/outlets')) return 'outlets'
  if (p.includes('/system/settings')) return 'settings'
  if (p.includes('/system/audit-logs')) return 'audit'
  return 'orders'
})

const currentTitle = computed(() => {
  const map = {
    orders: '🧾 Riwayat Pesanan & Invoice POS',
    payments: '💳 Rekonsiliasi Pembayaran (Cash, QRIS, EDC, Wallet)',
    access_logs: '🚶 Riwayat Scan Turnstile Gate',
    gates: '🚧 Konfigurasi Perangkat Tripod Turnstile Gate',
    bookings: '🎂 Reservasi Rombongan & Ulang Tahun',
    registrations: '📱 Registrasi Tiket Online',
    sales: '📊 Laporan Penjualan Harian & Shift',
    items: '📈 Laporan Penjualan per Produk & Paket',
    visitors_report: '🧒 Laporan Kunjungan & Durasi Bermain',
    outlets: '🏢 Daftar Cabang Outlet Playtopia',
    settings: '⚙️ Pengaturan Operasional Sistem',
    audit: '🔍 Log Audit Aktivitas & Keamanan'
  }
  return map[section.value] || 'Operasional Playtopia'
})

const currentSubtitle = computed(() =>
  'Data terintegrasi langsung dengan database MySQL playtopia_id sesuai hak akses role Anda.'
)

const loading = ref(false)
const saving = ref(false)
const feedback = ref(null)
const orders = ref([])
const accessLogs = ref([])
const bookings = ref([])
const sysData = reactive({
  outlets: [],
  gates: [],
  settings: [],
  audit_logs: [],
  item_sales: []
})

const showBookingModal = ref(false)
const bookingForm = reactive({
  customer_name: '',
  customer_phone: '',
  booking_date: new Date().toISOString().slice(0, 10),
  guest_count: 15,
  total: 1500000
})

async function loadAll() {
  loading.value = true
  try {
    const [txRes, logRes, bookRes, sysRes] = await Promise.all([
      api('/transactions'),
      api('/simulator/logs'),
      api('/admin/bookings'),
      api('/admin/system-data')
    ])
    if (txRes.success) orders.value = txRes.data || []
    if (logRes.success) accessLogs.value = logRes.data || []
    if (bookRes.success) bookings.value = bookRes.data || []
    if (sysRes.success && sysRes.data) {
      sysData.outlets = sysRes.data.outlets || []
      sysData.gates = sysRes.data.gates || []
      sysData.settings = (sysRes.data.settings || []).map(s => ({
        ...s,
        value_jsonStr: typeof s.value_json === 'string' ? s.value_json : JSON.stringify(s.value_json)
      }))
      sysData.audit_logs = sysRes.data.audit_logs || []
      sysData.item_sales = sysRes.data.item_sales || []
    }
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  } finally {
    loading.value = false
  }
}

async function createBooking() {
  saving.value = true
  try {
    await api('/admin/bookings', { method: 'POST', body: { ...bookingForm } })
    showBookingModal.value = false
    feedback.value = { type: 'success', text: `Booking untuk ${bookingForm.customer_name} berhasil dijadwalkan!` }
    await loadAll()
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  } finally {
    saving.value = false
  }
}

async function saveSettings() {
  saving.value = true
  try {
    for (const s of sysData.settings) {
      await api('/admin/settings', {
        method: 'PUT',
        body: { key_name: s.key_name, value_json: s.value_jsonStr }
      })
    }
    feedback.value = { type: 'success', text: 'Parameter operasional berhasil disimpan.' }
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  } finally {
    saving.value = false
  }
}

onMounted(loadAll)
</script>

