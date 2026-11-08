<template>
  <div class="catalog-manager-page">
    <!-- Header -->
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 bg-white p-3 rounded-4 shadow-sm border">
      <div>
        <h4 class="mb-0 fw-bold text-dark">
          📦 Katalog Produk, Paket Bermain &amp; Unit Bisnis
        </h4>
        <small class="text-muted">
          Kelola paket tiket Playground (durasi, grace period, re-entry, denda overtime) serta menu Cafe &amp; Snack.
        </small>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <button
          type="button"
          class="btn btn-sm fw-bold"
          :class="activeTab === 'products' ? 'btn-play-sky' : 'btn-outline-primary'"
          @click="activeTab = 'products'"
        >
          🎡 Produk &amp; Paket ({{ products.length }})
        </button>
        <button
          type="button"
          class="btn btn-sm fw-bold"
          :class="activeTab === 'units' ? 'btn-play-pink' : 'btn-outline-primary'"
          @click="activeTab = 'units'"
        >
          🏢 Unit Bisnis ({{ businessUnits.length }})
        </button>
        <button
          type="button"
          class="btn btn-sm btn-play-mint fw-bold"
          :disabled="!auth.can('catalog.products', 'create')"
          @click="openCreateModal"
        >
          + Tambah Produk / Paket
        </button>
      </div>
    </div>

    <div v-if="feedback" class="alert alert-dismissible mb-3" :class="'alert-' + feedback.type">
      <span>{{ feedback.text }}</span>
      <button type="button" class="btn-close" @click="feedback = null" />
    </div>

    <!-- TAB 1: PRODUCTS -->
    <div v-if="activeTab === 'products'" class="card">
      <div class="card-header card-header-sky py-3 d-flex justify-content-between align-items-center">
        <span class="fw-bold">Daftar Produk Playground &amp; Cafe</span>
        <span class="badge bg-white text-primary">Tabel: products &amp; ticket_package_rules</span>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nama Produk / Paket</th>
                <th>Unit Bisnis</th>
                <th>Aturan Durasi &amp; Gate</th>
                <th>Harga Jual</th>
                <th>Status</th>
                <th class="text-end">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in products" :key="p.id">
                <td class="font-monospace small fw-bold text-primary">{{ p.sku }}</td>
                <td>
                  <div class="fw-bold text-dark">{{ p.name }}</div>
                  <small class="text-muted">{{ p.description }}</small>
                </td>
                <td>
                  <span
                    class="badge"
                    :class="p.unit_code === 'PLAYGROUND' ? 'badge-play-sky' : p.unit_code === 'CAFE' ? 'badge-play-pink' : 'badge-play-amber'"
                  >
                    {{ p.unit_name }}
                  </span>
                </td>
                <td>
                  <template v-if="p.item_type === 'ticket_package' || p.unit_code === 'PLAYGROUND'">
                    <span class="badge badge-play-amber me-1">
                      ⏱️ {{ p.is_open_play ? 'Sepuasnya' : (p.duration_minutes || 60) + ' mnt' }}
                    </span>
                    <span class="badge badge-play-mint">
                      Re-entry {{ p.max_reentry || 2 }}x
                    </span>
                  </template>
                  <span v-else class="text-muted small">Item Langsung (F&amp;B)</span>
                </td>
                <td class="fw-bold text-primary fs-6">{{ rupiah(p.base_price) }}</td>
                <td>
                  <span class="badge" :class="p.is_active ? 'bg-success' : 'bg-secondary'">
                    {{ p.is_active ? 'AKTIF' : 'NONAKTIF' }}
                  </span>
                </td>
                <td class="text-end">
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-primary"
                    :disabled="!auth.can('catalog.products', 'update')"
                    @click="openEditModal(p)"
                  >
                    ✏️ Edit
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 2: BUSINESS UNITS -->
    <div v-else class="row g-3">
      <div v-for="bu in businessUnits" :key="bu.id" class="col-md-4">
        <div class="card h-100 p-3">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="badge badge-play-sky font-monospace">{{ bu.code }}</span>
            <span class="badge bg-success">Aktif</span>
          </div>
          <h5 class="fw-bold text-dark">{{ bu.name }}</h5>
          <p class="text-muted small mb-3">
            Unit bisnis terintegrasi dalam 1 invoice POS Playtopia dan terpisah otomatis pada laporan closing shift.
          </p>
          <div class="mt-auto pt-2 border-top d-flex justify-content-between small">
            <span class="text-muted">Jumlah Produk:</span>
            <strong class="text-primary">{{ products.filter(p => p.business_unit_id === bu.id).length }} item</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Produk -->
    <div v-if="showModal" class="pos-backdrop">
      <div class="card pos-dialog" style="max-width: 560px;">
        <div class="card-header card-header-sky py-3 d-flex justify-content-between align-items-center">
          <strong>{{ editingItem ? '✏️ Edit Produk / Paket' : '➕ Tambah Produk / Paket Baru' }}</strong>
          <button type="button" class="btn-close btn-close-white" @click="showModal = false" />
        </div>
        <div class="card-body">
          <div class="row g-2 mb-3">
            <div class="col-sm-8">
              <label class="form-label small fw-bold">Nama Produk / Paket</label>
              <input v-model.trim="form.name" type="text" class="form-control" placeholder="Contoh: Paket Bermain 3 Jam">
            </div>
            <div class="col-sm-4">
              <label class="form-label small fw-bold">Kategori Unit</label>
              <select v-model="form.category" class="form-select">
                <option value="PLAYGROUND">🎡 Playground</option>
                <option value="CAFE">☕ Cafe F&amp;B</option>
              </select>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label small fw-bold">Deskripsi Singkat</label>
            <input v-model.trim="form.description" type="text" class="form-control" placeholder="Keterangan paket / menu">
          </div>
          <div class="row g-2 mb-3">
            <div class="col-sm-6">
              <label class="form-label small fw-bold">Harga Jual (Rp)</label>
              <input v-model.number="form.base_price" type="number" min="0" step="1000" class="form-control fw-bold">
            </div>
            <div v-if="form.category === 'PLAYGROUND'" class="col-sm-6">
              <label class="form-label small fw-bold">Durasi Bermain (Menit)</label>
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
          <div v-if="form.category === 'PLAYGROUND'" class="p-3 rounded-3 bg-light border mb-3">
            <div class="form-check form-switch mb-2">
              <input id="open-play" v-model="form.is_open_play" type="checkbox" class="form-check-input">
              <label for="open-play" class="form-check-label fw-bold small">Tiket Bermain Sepuasnya (All-Day Open Play)</label>
            </div>
            <div class="row g-2">
              <div class="col-sm-4">
                <label class="form-label small">Grace Period (Mnt)</label>
                <input v-model.number="form.grace_period_minutes" type="number" class="form-control form-control-sm">
              </div>
              <div class="col-sm-4">
                <label class="form-label small">Maks Re-entry</label>
                <input v-model.number="form.max_reentry" type="number" class="form-control form-control-sm">
              </div>
              <div class="col-sm-4">
                <label class="form-label small">Denda Overtime/30m</label>
                <input v-model.number="form.overtime_block_price" type="number" class="form-control form-control-sm">
              </div>
            </div>
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-outline-secondary" @click="showModal = false">Batal</button>
            <button
              type="button"
              class="btn btn-play-sky fw-bold"
              :disabled="!form.name || form.base_price < 0 || saving"
              @click="submitProduct"
            >
              {{ saving ? 'Menyimpan...' : '✓ Simpan Produk' }}
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
