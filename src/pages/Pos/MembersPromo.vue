<template>
  <div class="pt-members-page">
    <!-- Top Page Bar -->
    <div class="pt-page-bar d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
      <div>
        <h5 class="mb-0 fw-semibold text-dark">{{ pageTitle }}</h5>
        <div class="text-muted" style="font-size: 12.5px;">{{ pageSubtitle }}</div>
      </div>

      <div class="d-flex flex-wrap align-items-center gap-2">
        <button
          v-if="activeTab === 'members' || activeTab === 'cards'"
          type="button"
          class="pt-btn-primary"
          @click="showMemberModal = true"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Registrasi Member</span>
        </button>

        <button
          v-if="activeTab === 'vouchers'"
          type="button"
          class="pt-btn-primary"
          @click="showVoucherModal = true"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Tambah Voucher</span>
        </button>

        <button
          type="button"
          class="pt-btn-outline"
          @click="loadData"
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

    <!-- TAB 1 & 2: MEMBERS & RFID CARDS -->
    <div v-if="activeTab === 'members' || activeTab === 'cards'" class="pt-panel">
      <div class="pt-panel-header d-flex flex-wrap justify-content-between align-items-center gap-2">
        <span class="fw-semibold text-dark">
          {{ activeTab === 'cards' ? 'Daftar Kartu RFID & Saldo Member' : 'Direktori Member Playtopia' }}
        </span>
        <span class="pt-tag">{{ members.length }} Member</span>
      </div>
      <div class="table-responsive">
        <table class="table pt-table align-middle mb-0">
          <thead>
            <tr>
              <th>Kode Member</th>
              <th>Nama Lengkap</th>
              <th>No. Telepon</th>
              <th>UID Kartu RFID</th>
              <th>Tier &amp; Diskon</th>
              <th>Poin</th>
              <th>Saldo Kartu</th>
              <th class="text-end">Tindakan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="members.length === 0">
              <td colspan="8" class="text-center text-muted py-4">Belum ada data member terdaftar.</td>
            </tr>
            <tr v-for="m in members" :key="m.id">
              <td class="font-monospace fw-semibold text-dark">{{ m.member_code }}</td>
              <td class="fw-medium text-dark">{{ m.full_name }}</td>
              <td>{{ m.phone }}</td>
              <td>
                <span class="pt-tag font-monospace">{{ m.card_uid || 'BELUM TERHUBUNG' }}</span>
              </td>
              <td>
                <span class="pt-dir-badge in">{{ m.tier }} ({{ Number(m.discount_percent || 0) }}%)</span>
              </td>
              <td>{{ m.points_balance || 0 }} pts</td>
              <td class="fw-semibold text-dark">{{ rupiah(m.wallet_balance || 0) }}</td>
              <td class="text-end">
                <button
                  type="button"
                  class="pt-btn-outline"
                  style="padding: 5px 11px; font-size: 12px;"
                  @click="openTopup(m)"
                >
                  Top-Up Saldo
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 3: MEMBERSHIP PLANS -->
    <div v-else-if="activeTab === 'plans'" class="row g-3">
      <div v-for="pl in plans" :key="pl.id" class="col-md-4">
        <div class="pt-panel p-4 h-100 d-flex flex-column">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="pt-dir-badge in">PAKET MEMBERSHIP</span>
            <span class="pt-tag">{{ pl.duration_days }} Hari</span>
          </div>
          <h5 class="fw-semibold text-dark mb-1">{{ pl.name }}</h5>
          <div class="fs-4 fw-bold text-dark my-2">{{ rupiah(pl.price) }}</div>
          <ul class="list-unstyled text-muted mb-0 mt-2 pt-2 border-top" style="font-size: 13px;">
            <li class="mb-1">Kuota Kunjungan: <strong class="text-dark">{{ pl.included_entries || 0 }}x Masuk</strong></li>
            <li class="mb-1">Diskon Transaksi POS: <strong class="text-dark">{{ pl.discount_percent }}%</strong></li>
            <li>Berlaku di seluruh cabang Playtopia</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- TAB 4: VOUCHERS -->
    <div v-else class="pt-panel">
      <div class="pt-panel-header d-flex justify-content-between align-items-center">
        <span class="fw-semibold text-dark">Daftar Voucher &amp; Promo Diskon</span>
        <span class="pt-tag">{{ vouchers.length }} Voucher</span>
      </div>
      <div class="table-responsive">
        <table class="table pt-table align-middle mb-0">
          <thead>
            <tr>
              <th>Kode Voucher</th>
              <th>Nama Program Promo</th>
              <th>Tipe Potongan</th>
              <th>Nilai Diskon</th>
              <th>Min. Transaksi</th>
              <th>Penggunaan</th>
              <th class="text-end">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="vouchers.length === 0">
              <td colspan="7" class="text-center text-muted py-4">Belum ada voucher promo.</td>
            </tr>
            <tr v-for="v in vouchers" :key="v.id">
              <td><span class="pt-tag font-monospace">{{ v.code }}</span></td>
              <td class="fw-medium text-dark">{{ v.name }}</td>
              <td>{{ v.discount_type === 'percentage' ? 'Persentase (%)' : 'Nominal (Rp)' }}</td>
              <td class="fw-semibold text-dark">
                {{ v.discount_type === 'percentage' ? v.discount_value + '%' : rupiah(v.discount_value) }}
              </td>
              <td>{{ rupiah(v.min_order_amount) }}</td>
              <td>{{ v.used_count }} / {{ v.quota || 'Tanpa Batas' }}</td>
              <td class="text-end">
                <span class="pt-status-badge allowed">Aktif</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Registrasi Member -->
    <div v-if="showMemberModal" class="pt-modal-backdrop">
      <div class="pt-panel" style="max-width: 480px; width: 100%;">
        <div class="pt-panel-header d-flex justify-content-between align-items-center">
          <span class="fw-semibold text-dark">Registrasi Member &amp; Kartu RFID</span>
          <button type="button" class="btn-close btn-sm" @click="showMemberModal = false" />
        </div>
        <div class="p-3">
          <div class="mb-2">
            <label class="form-label small fw-semibold">Nama Lengkap</label>
            <input v-model.trim="memberForm.full_name" type="text" class="form-control" placeholder="Nama lengkap member">
          </div>
          <div class="row g-2 mb-2">
            <div class="col-6">
              <label class="form-label small fw-semibold">No. Telepon</label>
              <input v-model.trim="memberForm.phone" type="text" class="form-control" placeholder="0812...">
            </div>
            <div class="col-6">
              <label class="form-label small fw-semibold">Tier Membership</label>
              <select v-model="memberForm.tier" class="form-select">
                <option value="SILVER">SILVER (Diskon 5%)</option>
                <option value="GOLD">GOLD (Diskon 10%)</option>
                <option value="PLATINUM">PLATINUM (Diskon 15%)</option>
              </select>
            </div>
          </div>
          <div class="row g-2 mb-3">
            <div class="col-6">
              <label class="form-label small fw-semibold">UID Kartu RFID</label>
              <input v-model.trim="memberForm.card_uid" type="text" class="form-control font-monospace" placeholder="RFID-000X">
            </div>
            <div class="col-6">
              <label class="form-label small fw-semibold">Saldo Awal (Rp)</label>
              <input v-model.number="memberForm.initial_balance" type="number" step="50000" class="form-control">
            </div>
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="pt-btn-outline" @click="showMemberModal = false">Batal</button>
            <button
              type="button"
              class="pt-btn-primary"
              :disabled="!memberForm.full_name || !memberForm.phone || saving"
              @click="createMember"
            >
              {{ saving ? 'Menyimpan...' : 'Simpan Member' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Topup Saldo -->
    <div v-if="topupTarget" class="pt-modal-backdrop">
      <div class="pt-panel" style="max-width: 440px; width: 100%;">
        <div class="pt-panel-header d-flex justify-content-between align-items-center">
          <span class="fw-semibold text-dark">Top-Up Saldo Kartu Member</span>
          <button type="button" class="btn-close btn-sm" @click="topupTarget = null" />
        </div>
        <div class="p-3">
          <div class="p-3 bg-light rounded-2 border mb-3" style="font-size: 13px;">
            <div class="fw-semibold text-dark">{{ topupTarget.full_name }}</div>
            <div class="text-muted mt-1">
              Kartu: <span class="font-monospace">{{ topupTarget.card_uid }}</span> &middot; Saldo: <strong>{{ rupiah(topupTarget.wallet_balance) }}</strong>
            </div>
          </div>
          <label class="form-label small fw-semibold">Nominal Top-Up (Rp)</label>
          <input v-model.number="topupAmount" type="number" min="10000" step="50000" class="form-control fw-semibold mb-2">
          <div class="d-flex gap-2 mb-3">
            <button type="button" class="pt-btn-outline" style="padding: 4px 10px; font-size: 12px;" @click="topupAmount = 100000">Rp 100.000</button>
            <button type="button" class="pt-btn-outline" style="padding: 4px 10px; font-size: 12px;" @click="topupAmount = 250000">Rp 250.000</button>
            <button type="button" class="pt-btn-outline" style="padding: 4px 10px; font-size: 12px;" @click="topupAmount = 500000">Rp 500.000</button>
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="pt-btn-outline" @click="topupTarget = null">Batal</button>
            <button
              type="button"
              class="pt-btn-primary"
              :disabled="topupAmount < 10000 || saving"
              @click="submitTopup"
            >
              {{ saving ? 'Memproses...' : 'Konfirmasi Top-Up' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Buat Voucher -->
    <div v-if="showVoucherModal" class="pt-modal-backdrop">
      <div class="pt-panel" style="max-width: 460px; width: 100%;">
        <div class="pt-panel-header d-flex justify-content-between align-items-center">
          <span class="fw-semibold text-dark">Tambah Voucher Diskon</span>
          <button type="button" class="btn-close btn-sm" @click="showVoucherModal = false" />
        </div>
        <div class="p-3">
          <div class="mb-2">
            <label class="form-label small fw-semibold">Kode Voucher</label>
            <input v-model.trim="voucherForm.code" type="text" class="form-control font-monospace text-uppercase" placeholder="PLAY15">
          </div>
          <div class="mb-2">
            <label class="form-label small fw-semibold">Nama Program Promo</label>
            <input v-model.trim="voucherForm.name" type="text" class="form-control" placeholder="Nama program promo">
          </div>
          <div class="row g-2 mb-3">
            <div class="col-6">
              <label class="form-label small fw-semibold">Tipe Potongan</label>
              <select v-model="voucherForm.discount_type" class="form-select">
                <option value="percentage">Persentase (%)</option>
                <option value="fixed">Nominal (Rp)</option>
              </select>
            </div>
            <div class="col-6">
              <label class="form-label small fw-semibold">Nilai Potongan</label>
              <input v-model.number="voucherForm.discount_value" type="number" class="form-control">
            </div>
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="pt-btn-outline" @click="showVoucherModal = false">Batal</button>
            <button
              type="button"
              class="pt-btn-primary"
              :disabled="!voucherForm.code || !voucherForm.name || saving"
              @click="createVoucher"
            >
              {{ saving ? 'Menyimpan...' : 'Simpan Voucher' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/utils/posApi'
import { rupiah } from '@/utils/format'

const route = useRoute()

function resolveTab(p) {
  if (p.includes('member-cards')) return 'cards'
  if (p.includes('membership-plans')) return 'plans'
  if (p.includes('vouchers')) return 'vouchers'
  return 'members'
}

const activeTab = ref(resolveTab(route.path))
const members = ref([])
const plans = ref([])
const vouchers = ref([])
const feedback = ref(null)
const saving = ref(false)

const pageTitle = computed(() => {
  if (activeTab.value === 'cards') return 'Kartu RFID Member'
  if (activeTab.value === 'plans') return 'Paket Membership'
  if (activeTab.value === 'vouchers') return 'Voucher Diskon'
  return 'Data Member'
})

const pageSubtitle = computed(() => {
  if (activeTab.value === 'cards') return 'Manajemen kartu RFID member dan pengisian ulang saldo deposit'
  if (activeTab.value === 'plans') return 'Konfigurasi paket langganan dan keuntungan tier membership'
  if (activeTab.value === 'vouchers') return 'Pengaturan kode kupon dan potongan harga transaksi POS'
  return 'Direktori pelanggan terdaftar, poin loyalitas, dan saldo kartu'
})

const showMemberModal = ref(false)
const showVoucherModal = ref(false)
const topupTarget = ref(null)
const topupAmount = ref(100000)

const memberForm = reactive({
  full_name: '',
  phone: '',
  tier: 'SILVER',
  card_uid: '',
  initial_balance: 100000
})

const voucherForm = reactive({
  code: '',
  name: '',
  discount_type: 'percentage',
  discount_value: 15,
  min_order_amount: 100000,
  quota: 100
})

watch(() => route.path, (p) => {
  activeTab.value = resolveTab(p)
})

async function loadData() {
  try {
    const res = await api('/admin/members-promo')
    if (res.success && res.data) {
      members.value = res.data.members || []
      plans.value = res.data.plans || []
      vouchers.value = res.data.vouchers || []
    }
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  }
}

async function createMember() {
  saving.value = true
  try {
    await api('/admin/members', { method: 'POST', body: { ...memberForm } })
    showMemberModal.value = false
    feedback.value = { type: 'success', text: `Member ${memberForm.full_name} berhasil didaftarkan.` }
    await loadData()
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  } finally {
    saving.value = false
  }
}

function openTopup(m) {
  topupTarget.value = m
  topupAmount.value = 100000
}

async function submitTopup() {
  if (!topupTarget.value) return
  saving.value = true
  try {
    const res = await api(`/admin/members/${topupTarget.value.id}/topup`, {
      method: 'POST',
      body: { amount: topupAmount.value }
    })
    feedback.value = {
      type: 'success',
      text: `Top-up sebesar ${rupiah(topupAmount.value)} untuk ${topupTarget.value.full_name} berhasil. Saldo baru: ${rupiah(res.data?.new_balance)}`
    }
    topupTarget.value = null
    await loadData()
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  } finally {
    saving.value = false
  }
}

async function createVoucher() {
  saving.value = true
  try {
    await api('/admin/vouchers', { method: 'POST', body: { ...voucherForm } })
    showVoucherModal.value = false
    feedback.value = { type: 'success', text: `Voucher ${voucherForm.code} berhasil ditambahkan.` }
    await loadData()
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  } finally {
    saving.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.pt-members-page {
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
