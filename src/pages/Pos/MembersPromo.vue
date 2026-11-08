<template>
  <div class="members-promo-page">
    <!-- Header -->
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 bg-white p-3 rounded-4 shadow-sm border">
      <div>
        <h4 class="mb-0 fw-bold text-dark">
          💳 Member, Kartu RFID, Paket Membership &amp; Voucher Promo
        </h4>
        <small class="text-muted">
          Kelola registrasi member, top-up saldo kartu RFID Mifare, tier diskon member, dan kupon diskon Playtopia.
        </small>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <button
          type="button"
          class="btn btn-sm fw-bold"
          :class="activeTab === 'members' ? 'btn-play-sky' : 'btn-outline-primary'"
          @click="activeTab = 'members'"
        >
          👥 Daftar Member ({{ members.length }})
        </button>
        <button
          type="button"
          class="btn btn-sm fw-bold"
          :class="activeTab === 'cards' ? 'btn-play-pink' : 'btn-outline-primary'"
          @click="activeTab = 'cards'"
        >
          💳 Kartu RFID &amp; Wallet
        </button>
        <button
          type="button"
          class="btn btn-sm fw-bold"
          :class="activeTab === 'plans' ? 'btn-play-amber' : 'btn-outline-primary'"
          @click="activeTab = 'plans'"
        >
          ⭐ Paket Membership ({{ plans.length }})
        </button>
        <button
          type="button"
          class="btn btn-sm fw-bold"
          :class="activeTab === 'vouchers' ? 'btn-play-mint' : 'btn-outline-primary'"
          @click="activeTab = 'vouchers'"
        >
          🎟️ Voucher Promo ({{ vouchers.length }})
        </button>
      </div>
    </div>

    <div v-if="feedback" class="alert alert-dismissible mb-3" :class="'alert-' + feedback.type">
      <span>{{ feedback.text }}</span>
      <button type="button" class="btn-close" @click="feedback = null" />
    </div>

    <!-- TAB 1 & 2: MEMBERS & RFID CARDS -->
    <div v-if="activeTab === 'members' || activeTab === 'cards'" class="card">
      <div class="card-header card-header-sky py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
        <span class="fw-bold">
          {{ activeTab === 'cards' ? '💳 Manajemen Kartu RFID & Saldo Wallet' : '👥 Direktori Member Playtopia' }}
        </span>
        <button
          type="button"
          class="btn btn-sm btn-light fw-bold text-primary"
          @click="showMemberModal = true"
        >
          + Registrasi Member &amp; Kartu RFID Baru
        </button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Kode Member</th>
                <th>Nama Member</th>
                <th>No. WhatsApp</th>
                <th>UID Kartu RFID</th>
                <th>Tier &amp; Diskon</th>
                <th>Poin</th>
                <th>Saldo Wallet</th>
                <th class="text-end">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in members" :key="m.id">
                <td class="font-monospace fw-bold text-primary">{{ m.member_code }}</td>
                <td class="fw-bold text-dark">{{ m.full_name }}</td>
                <td>{{ m.phone }}</td>
                <td>
                  <span class="badge badge-play-sky font-monospace">
                    💳 {{ m.card_uid || 'BELUM PAIR' }}
                  </span>
                </td>
                <td>
                  <span class="badge badge-play-amber">
                    {{ m.tier }} ({{ Number(m.discount_percent || 0) }}%)
                  </span>
                </td>
                <td>{{ m.points_balance || 0 }} pts</td>
                <td class="fw-bold text-success fs-6">{{ rupiah(m.wallet_balance || 0) }}</td>
                <td class="text-end">
                  <button
                    type="button"
                    class="btn btn-sm btn-play-mint fw-bold"
                    @click="openTopup(m)"
                  >
                    💰 Top-Up Saldo
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 3: MEMBERSHIP PLANS -->
    <div v-else-if="activeTab === 'plans'" class="row g-3">
      <div v-for="pl in plans" :key="pl.id" class="col-md-4">
        <div class="card h-100 p-4 border-primary">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="badge badge-play-amber">⭐ TIER PLAN</span>
            <span class="badge bg-success">{{ pl.duration_days }} Hari</span>
          </div>
          <h4 class="fw-bold text-dark">{{ pl.name }}</h4>
          <div class="fs-3 fw-bold text-primary my-2">{{ rupiah(pl.price) }}</div>
          <ul class="list-unstyled small text-muted mb-0">
            <li class="mb-1">✓ Gratis Masuk: <strong>{{ pl.included_entries || 0 }}x Kunjungan</strong></li>
            <li class="mb-1">✓ Diskon Transaksi POS: <strong>{{ pl.discount_percent }}%</strong></li>
            <li>✓ Berlaku di seluruh wahana Playtopia</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- TAB 4: VOUCHERS -->
    <div v-else class="card">
      <div class="card-header card-header-pink py-3 d-flex justify-content-between align-items-center">
        <span class="fw-bold">🎟️ Daftar Voucher &amp; Kupon Diskon</span>
        <button type="button" class="btn btn-sm btn-light fw-bold text-danger" @click="showVoucherModal = true">
          + Buat Voucher Promo
        </button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Kode Voucher</th>
                <th>Nama Promo</th>
                <th>Tipe Diskon</th>
                <th>Nilai Potongan</th>
                <th>Min. Belanja</th>
                <th>Kuota Terpakai</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in vouchers" :key="v.id">
                <td><span class="badge badge-play-pink font-monospace fs-6">{{ v.code }}</span></td>
                <td class="fw-bold text-dark">{{ v.name }}</td>
                <td>{{ v.discount_type === 'percentage' ? 'Persentase (%)' : 'Potongan Nominal (Rp)' }}</td>
                <td class="fw-bold text-primary">
                  {{ v.discount_type === 'percentage' ? v.discount_value + '%' : rupiah(v.discount_value) }}
                </td>
                <td>{{ rupiah(v.min_order_amount) }}</td>
                <td>{{ v.used_count }} / {{ v.quota || '∞' }}</td>
                <td><span class="badge bg-success">AKTIF</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal Registrasi Member -->
    <div v-if="showMemberModal" class="pos-backdrop">
      <div class="card pos-dialog" style="max-width: 480px;">
        <div class="card-header card-header-sky py-3 d-flex justify-content-between align-items-center">
          <strong>➕ Registrasi Member &amp; Kartu RFID</strong>
          <button type="button" class="btn-close btn-close-white" @click="showMemberModal = false" />
        </div>
        <div class="card-body">
          <div class="mb-2">
            <label class="form-label small fw-bold">Nama Lengkap Orang Tua / Member</label>
            <input v-model.trim="memberForm.full_name" type="text" class="form-control" placeholder="Contoh: Ibu Rina Wijaya">
          </div>
          <div class="row g-2 mb-2">
            <div class="col-6">
              <label class="form-label small fw-bold">Nomor HP / WhatsApp</label>
              <input v-model.trim="memberForm.phone" type="text" class="form-control" placeholder="0812...">
            </div>
            <div class="col-6">
              <label class="form-label small fw-bold">Tier Membership</label>
              <select v-model="memberForm.tier" class="form-select">
                <option value="SILVER">SILVER (Diskon 5%)</option>
                <option value="GOLD">GOLD (Diskon 10%)</option>
                <option value="PLATINUM">PLATINUM (Diskon 15%)</option>
              </select>
            </div>
          </div>
          <div class="row g-2 mb-3">
            <div class="col-6">
              <label class="form-label small fw-bold">UID Kartu RFID</label>
              <input v-model.trim="memberForm.card_uid" type="text" class="form-control font-monospace" placeholder="RFID-000X">
            </div>
            <div class="col-6">
              <label class="form-label small fw-bold">Saldo Awal (Rp)</label>
              <input v-model.number="memberForm.initial_balance" type="number" step="50000" class="form-control fw-bold">
            </div>
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-outline-secondary" @click="showMemberModal = false">Batal</button>
            <button
              type="button"
              class="btn btn-play-sky fw-bold"
              :disabled="!memberForm.full_name || !memberForm.phone || saving"
              @click="createMember"
            >
              {{ saving ? 'Menyimpan...' : '✓ Daftarkan Member' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Topup Saldo -->
    <div v-if="topupTarget" class="pos-backdrop">
      <div class="card pos-dialog" style="max-width: 440px;">
        <div class="card-header card-header-mint py-3 d-flex justify-content-between align-items-center">
          <strong>💰 Top-Up Saldo Kartu RFID</strong>
          <button type="button" class="btn-close btn-close-white" @click="topupTarget = null" />
        </div>
        <div class="card-body">
          <div class="p-3 bg-light rounded-3 border mb-3">
            <div class="fw-bold text-dark">{{ topupTarget.full_name }}</div>
            <div class="small text-muted">Kartu: {{ topupTarget.card_uid }} &middot; Saldo saat ini: <strong>{{ rupiah(topupTarget.wallet_balance) }}</strong></div>
          </div>
          <label class="form-label small fw-bold">Nominal Top-Up (Rp)</label>
          <input v-model.number="topupAmount" type="number" min="10000" step="50000" class="form-control form-control-lg fw-bold mb-2">
          <div class="d-flex gap-2 mb-3">
            <button type="button" class="btn btn-sm btn-outline-primary" @click="topupAmount = 100000">Rp 100rb</button>
            <button type="button" class="btn btn-sm btn-outline-primary" @click="topupAmount = 250000">Rp 250rb</button>
            <button type="button" class="btn btn-sm btn-outline-primary" @click="topupAmount = 500000">Rp 500rb</button>
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-outline-secondary" @click="topupTarget = null">Batal</button>
            <button
              type="button"
              class="btn btn-play-mint fw-bold"
              :disabled="topupAmount < 10000 || saving"
              @click="submitTopup"
            >
              {{ saving ? 'Memproses...' : '✓ Top-Up Sekarang' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Buat Voucher -->
    <div v-if="showVoucherModal" class="pos-backdrop">
      <div class="card pos-dialog" style="max-width: 460px;">
        <div class="card-header card-header-pink py-3 d-flex justify-content-between align-items-center">
          <strong>🎟️ Buat Voucher Promo Baru</strong>
          <button type="button" class="btn-close btn-close-white" @click="showVoucherModal = false" />
        </div>
        <div class="card-body">
          <div class="mb-2">
            <label class="form-label small fw-bold">Kode Voucher</label>
            <input v-model.trim="voucherForm.code" type="text" class="form-control font-monospace text-uppercase" placeholder="CERIA50">
          </div>
          <div class="mb-2">
            <label class="form-label small fw-bold">Nama Promo</label>
            <input v-model.trim="voucherForm.name" type="text" class="form-control" placeholder="Diskon Liburan Sekolah">
          </div>
          <div class="row g-2 mb-3">
            <div class="col-6">
              <label class="form-label small fw-bold">Tipe</label>
              <select v-model="voucherForm.discount_type" class="form-select">
                <option value="percentage">Persentase (%)</option>
                <option value="fixed">Nominal (Rp)</option>
              </select>
            </div>
            <div class="col-6">
              <label class="form-label small fw-bold">Nilai Diskon</label>
              <input v-model.number="voucherForm.discount_value" type="number" class="form-control fw-bold">
            </div>
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-outline-secondary" @click="showVoucherModal = false">Batal</button>
            <button
              type="button"
              class="btn btn-play-pink fw-bold"
              :disabled="!voucherForm.code || !voucherForm.name || saving"
              @click="createVoucher"
            >
              ✓ Simpan Voucher
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
      text: `Top-up ${rupiah(topupAmount.value)} untuk ${topupTarget.value.full_name} berhasil! Saldo baru: ${rupiah(res.data?.new_balance)}`
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
    feedback.value = { type: 'success', text: `Voucher ${voucherForm.code} berhasil dibuat.` }
    await loadData()
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  } finally {
    saving.value = false
  }
}

onMounted(loadData)
</script>

