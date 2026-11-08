<template>
  <div class="pt-catalog-page">
    <!-- Top Page Bar -->
    <div class="pt-page-bar d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
      <div>
        <h5 class="mb-0 fw-semibold text-dark">
          {{ activeTab === 'units' ? 'Unit Bisnis' : 'Produk & Paket Bermain' }}
        </h5>
        <div class="text-muted" style="font-size: 12.5px;">
          {{
            activeTab === 'units'
              ? 'Daftar divisi unit bisnis yang terhubung dengan transaksi POS'
              : 'Pengaturan harga paket durasi playground, kuota re-entry, dan menu cafe'
          }}
        </div>
      </div>

      <div class="d-flex flex-wrap align-items-center gap-2">
        <button
          v-if="activeTab === 'products'"
          type="button"
          class="pt-btn-primary"
          :disabled="!auth.can('catalog.products', 'create')"
          @click="openCreateModal"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Tambah Produk</span>
        </button>

        <button
          type="button"
          class="pt-btn-outline"
          @click="loadCatalog"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <div
      v-if="feedback"
      class="pt-alert mb-3 d-flex align-items-center justify-content-between"
      :class="feedback.type === 'danger' ? 'pt-alert-danger' : 'pt-alert-success'"
    >
      <span>{{ feedback.text }}</span>
      <button type="button" class="btn-close btn-sm" @click="feedback = null" />
    </div>

    <!-- TAB 1: PRODUCTS -->
    <div v-if="activeTab === 'products'" class="pt-panel">
      <div class="pt-panel-header d-flex justify-content-between align-items-center">
        <span class="fw-semibold text-dark">Katalog Produk &amp; Paket Durasi</span>
        <span class="pt-tag">{{ products.length }} Item</span>
      </div>
      <div class="table-responsive">
        <table class="table pt-table align-middle mb-0">
          <thead>
            <tr>
              <th>Kode SKU</th>
              <th>Nama Produk / Paket</th>
              <th>Unit Bisnis</th>
              <th>Parameter Durasi &amp; Gate</th>
              <th>Harga Jual</th>
              <th>Status</th>
              <th class="text-end">Tindakan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="products.length === 0">
              <td colspan="7" class="text-center text-muted py-4">Belum ada produk atau paket.</td>
            </tr>
            <tr v-for="p in products" :key="p.id">
              <td class="font-monospace fw-semibold text-dark">{{ p.sku }}</td>
              <td>
                <div class="fw-medium text-dark">{{ p.name }}</div>
                <div class="text-muted" style="font-size: 12px;">{{ p.description }}</div>
              </td>
              <td>
                <span class="pt-dir-badge" :class="p.unit_code === 'PLAYGROUND' ? 'in' : 'out'">
                  {{ p.unit_name }}
                </span>
              </td>
              <td>
                <template v-if="p.item_type === 'ticket_package' || p.unit_code === 'PLAYGROUND'">
                  <span class="pt-tag me-1">
                    {{ p.is_open_play ? 'Sepuasnya' : (p.duration_minutes || 60) + ' Menit' }}
                  </span>
                  <span class="pt-tag">
                    Re-entry {{ p.max_reentry || 2 }}x
                  </span>
                </template>
                <span v-else class="text-muted" style="font-size: 12px;">Produk Langsung</span>
              </td>
              <td class="fw-semibold text-dark">{{ rupiah(p.base_price) }}</td>
              <td>
                <span class="pt-status-badge" :class="p.is_active ? 'allowed' : 'denied'">
                  {{ p.is_active ? 'Aktif' : 'Nonaktif' }}
                </span>
              </td>
              <td class="text-end">
                <button
                  type="button"
                  class="pt-btn-outline"
                  style="padding: 5px 11px; font-size: 12px;"
                  :disabled="!auth.can('catalog.products', 'update')"
                  @click="openEditModal(p)"
                >
                  Ubah
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 2: BUSINESS UNITS -->
    <div v-else class="row g-3">
      <div v-for="bu in businessUnits" :key="bu.id" class="col-md-4">
        <div class="pt-panel p-3 h-100 d-flex flex-column justify-content-between">
          <div>
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="pt-tag font-monospace">{{ bu.code }}</span>
              <span class="pt-status-badge allowed">Aktif</span>
            </div>
            <h6 class="fw-semibold text-dark mb-1">{{ bu.name }}</h6>
            <p class="text-muted mb-3" style="font-size: 12.5px;">
              Tercatat dalam invoice POS terpadu dengan pemisahan laporan omset per unit.
            </p>
          </div>
          <div class="pt-2 border-top d-flex justify-content-between align-items-center" style="font-size: 12.5px;">
            <span class="text-muted">Total Produk Terdaftar</span>
            <strong class="text-dark">{{ products.filter(p => p.business_unit_id === bu.id).length }} Item</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Produk -->
    <div v-if="showModal" class="pt-modal-backdrop">
      <div class="pt-panel" style="max-width: 540px; width: 100%;">
        <div class="pt-panel-header d-flex justify-content-between align-items-center">
          <span class="fw-semibold text-dark">{{ editingItem ? 'Ubah Produk / Paket' : 'Tambah Produk / Paket Baru' }}</span>
          <button type="button" class="btn-close btn-sm" @click="showModal = false" />
        </div>
        <div class="p-3">
          <div class="row g-2 mb-3">
            <div class="col-sm-8">
              <label class="form-label small fw-semibold">Nama Produk / Paket</label>
              <input v-model.trim="form.name" type="text" class="form-control" placeholder="Nama paket atau produk">
            </div>
            <div class="col-sm-4">
              <label class="form-label small fw-semibold">Kategori Unit</label>
              <select v-model="form.category" class="form-select">
                <option value="PLAYGROUND">Playground</option>
                <option value="CAFE">Cafe F&amp;B</option>
              </select>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label small fw-semibold">Deskripsi</label>
            <input v-model.trim="form.description" type="text" class="form-control" placeholder="Keterangan singkat">
          </div>
          <div class="row g-2 mb-3">
            <div class="col-sm-6">
              <label class="form-label small fw-semibold">Harga Jual (Rp)</label>
              <input v-model.number="form.base_price" type="number" min="0" step="1000" class="form-control fw-semibold">
            </div>
            <div v-if="form.category === 'PLAYGROUND'" class="col-sm-6">
              <label class="form-label small fw-semibold">Durasi Bermain (Menit)</label>
              <input
                v-model.number="form.duration_minutes"
                type="number"
                min="15"
                step="15"
                class="form-control"
                :disabled="form.is_open_play"
              >
            </div>
          </div>
          <div v-if="form.category === 'PLAYGROUND'" class="p-3 rounded-2 bg-light border mb-3">
            <div class="form-check form-switch mb-2">
              <input id="open-play" v-model="form.is_open_play" type="checkbox" class="form-check-input">
              <label for="open-play" class="form-check-label fw-semibold small">Paket Bermain Sepuasnya (All-Day)</label>
            </div>
            <div class="row g-2">
              <div class="col-sm-4">
                <label class="form-label small text-muted mb-1">Toleransi (Mnt)</label>
                <input v-model.number="form.grace_period_minutes" type="number" class="form-control form-control-sm">
              </div>
              <div class="col-sm-4">
                <label class="form-label small text-muted mb-1">Maks Re-entry</label>
                <input v-model.number="form.max_reentry" type="number" class="form-control form-control-sm">
              </div>
              <div class="col-sm-4">
                <label class="form-label small text-muted mb-1">Biaya Overtime</label>
                <input v-model.number="form.overtime_block_price" type="number" class="form-control form-control-sm">
              </div>
            </div>
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="pt-btn-outline" @click="showModal = false">Batal</button>
            <button
              type="button"
              class="pt-btn-primary"
              :disabled="!form.name || form.base_price < 0 || saving"
              @click="submitProduct"
            >
              {{ saving ? 'Menyimpan...' : 'Simpan Produk' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/utils/posApi'
import { rupiah } from '@/utils/format'
import { usePosAuthStore } from '@/stores/posAuth'

const route = useRoute()
const auth = usePosAuthStore()

const activeTab = ref(route.path.includes('business-units') ? 'units' : 'products')
const products = ref([])
const businessUnits = ref([])
const showModal = ref(false)
const editingItem = ref(null)
const saving = ref(false)
const feedback = ref(null)

const form = reactive({
  name: '',
  category: 'PLAYGROUND',
  description: '',
  base_price: 50000,
  duration_minutes: 60,
  is_open_play: false,
  grace_period_minutes: 10,
  max_reentry: 2,
  overtime_block_price: 15000,
  is_active: true
})

watch(() => route.path, (p) => {
  activeTab.value = p.includes('business-units') ? 'units' : 'products'
})

async function loadCatalog() {
  try {
    const res = await api('/admin/catalog')
    if (res.success && res.data) {
      products.value = res.data.products || []
      businessUnits.value = res.data.business_units || []
    }
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  }
}

function openCreateModal() {
  editingItem.value = null
  form.name = ''
  form.category = 'PLAYGROUND'
  form.description = ''
  form.base_price = 50000
  form.duration_minutes = 60
  form.is_open_play = false
  form.grace_period_minutes = 10
  form.max_reentry = 2
  form.overtime_block_price = 15000
  form.is_active = true
  showModal.value = true
}

function openEditModal(p) {
  editingItem.value = p
  form.name = p.name
  form.category = p.unit_code === 'PLAYGROUND' ? 'PLAYGROUND' : 'CAFE'
  form.description = p.description || ''
  form.base_price = Number(p.base_price)
  form.duration_minutes = Number(p.duration_minutes) || 60
  form.is_open_play = Boolean(p.is_open_play)
  form.grace_period_minutes = Number(p.grace_period_minutes) || 10
  form.max_reentry = Number(p.max_reentry) || 2
  form.overtime_block_price = Number(p.overtime_block_price) || 15000
  form.is_active = Boolean(p.is_active)
  showModal.value = true
}

async function submitProduct() {
  saving.value = true
  try {
    if (editingItem.value) {
      await api(`/admin/products/${editingItem.value.id}`, {
        method: 'PUT',
        body: { ...form }
      })
      feedback.value = { type: 'success', text: `Produk "${form.name}" berhasil diperbarui.` }
    } else {
      await api('/admin/products', {
        method: 'POST',
        body: { ...form }
      })
      feedback.value = { type: 'success', text: `Produk "${form.name}" berhasil ditambahkan.` }
    }
    showModal.value = false
    await loadCatalog()
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  } finally {
    saving.value = false
  }
}

onMounted(loadCatalog)
</script>

<style scoped>
.pt-catalog-page {
  max-width: 1400px;
}

.pt-page-bar {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px 18px;
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

.pt-alert-success {
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
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

.pt-dir-badge.out {
  background: #f1f5f9;
  color: #334155;
}

.pt-status-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 5px;
}

.pt-status-badge.allowed {
  background: #dcfce7;
  color: #15803d;
}

.pt-status-badge.denied {
  background: #fee2e2;
  color: #b91c1c;
}

.pt-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1055;
  padding: 16px;
}
</style>
