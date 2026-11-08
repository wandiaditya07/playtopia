<template>
  <div class="pos-cashier">
    <!-- Header -->
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <div class="d-flex align-items-center gap-2">
        <h1 class="page-title mb-0">
          Kasir POS
        </h1>
        <span
          v-if="!shiftLoading"
          class="badge"
          :class="shift ? 'bg-success' : 'bg-danger'"
        >
          {{ shift ? `Shift #${shift.shift.id} dibuka` : 'Shift belum dibuka' }}
        </span>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <button
          type="button"
          class="btn btn-outline-primary btn-sm"
          @click="openCustomerDisplay"
        >
          Buka Layar Pelanggan
        </button>
        <router-link
          to="/app/visitors"
          class="btn btn-outline-secondary btn-sm"
        >
          Pengunjung Aktif <span class="badge bg-primary ms-1">{{ activeVisitors }}</span>
        </router-link>
      </div>
    </div>

    <div
      v-if="!shiftLoading && !shift"
      class="alert alert-warning d-flex flex-wrap justify-content-between align-items-center gap-2"
      role="alert"
    >
      <span>Belum ada shift yang dibuka. Transaksi tidak bisa diproses.</span>
      <router-link
        to="/app/closing"
        class="btn btn-warning btn-sm"
      >
        Buka Shift
      </router-link>
    </div>

    <div
      v-if="loadError"
      class="alert alert-danger d-flex flex-wrap justify-content-between align-items-center gap-2"
      role="alert"
    >
      <span>{{ loadError }}</span>
      <button
        type="button"
        class="btn btn-danger btn-sm"
        :disabled="productsLoading"
        @click="loadAll"
      >
        {{ productsLoading ? 'Memuat...' : 'Coba Lagi' }}
      </button>
    </div>

    <div class="row">
      <!-- Katalog produk -->
      <div class="col-xl-8 mb-3">
        <div class="card h-100">
          <div class="card-body">
            <ul class="nav nav-pills mb-3">
              <li
                v-for="tab in tabs"
                :key="tab.value"
                class="nav-item"
              >
                <button
                  type="button"
                  class="nav-link"
                  :class="{ active: selectedCategory === tab.value }"
                  @click="selectedCategory = tab.value"
                >
                  {{ tab.label }} ({{ tab.count }})
                </button>
              </li>
            </ul>

            <div
              v-if="productsLoading"
              class="text-center text-muted py-5"
            >
              <span class="spinner-border spinner-border-sm me-2" />Memuat produk...
            </div>
            <div
              v-else-if="filteredProducts.length === 0"
              class="text-center text-muted py-5"
            >
              Tidak ada produk.
            </div>

            <div
              v-else
              class="row g-3"
            >
              <div
                v-for="p in filteredProducts"
                :key="p.id"
                class="col-md-6 col-xxl-4"
              >
                <button
                  type="button"
                  class="product-card card h-100 w-100 text-start"
                  :class="p.category === 'PLAYGROUND' ? 'product-playground' : 'product-cafe'"
                  :disabled="!canEditCart"
                  @click="addToCart(p)"
                >
                  <span class="card-body d-flex flex-column justify-content-between p-3">
                    <span>
                      <span class="d-flex justify-content-between mb-2">
                        <span
                          class="badge"
                          :class="p.category === 'PLAYGROUND' ? 'badge-play-sky' : 'badge-play-pink'"
                        >{{ p.category === 'PLAYGROUND' ? '🎡 Playground' : '☕ Cafe F&B' }}</span>
                        <span
                          v-if="p.category === 'PLAYGROUND'"
                          class="badge bg-dark text-white fw-bold"
                        >{{ p.is_open_play ? 'Sepuasnya' : p.duration_minutes + ' mnt' }}</span>
                      </span>
                      <span class="d-block fw-bold text-dark fs-6">{{ p.name }}</span>
                      <span class="d-block small text-muted mt-1">{{ p.description }}</span>
                    </span>
                    <span class="d-block mt-3 fs-5 fw-bold text-primary">{{ rupiah(p.price) }}</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Keranjang -->
      <div class="col-xl-4 mb-3">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <strong>Keranjang</strong>
            <button
              type="button"
              class="btn btn-outline-danger btn-sm"
              :disabled="cart.length === 0 || submitting"
              @click="clearCart"
            >
              Kosongkan
            </button>
          </div>
          <div class="card-body">
            <!-- Member -->
            <label
              class="form-label small text-muted mb-1"
              for="member-input"
            >Member (tap kartu RFID / nomor HP)</label>
            <div class="input-group input-group-sm mb-1">
              <input
                id="member-input"
                v-model.trim="memberQuery"
                type="text"
                class="form-control"
                placeholder="UID kartu atau No. HP"
                :disabled="lookupBusy || !!member || submitting"
                @keyup.enter="lookupMember"
              >
              <button
                v-if="!member"
                type="button"
                class="btn btn-outline-secondary"
                :disabled="!memberQuery || lookupBusy || submitting"
                @click="lookupMember"
              >
                {{ lookupBusy ? 'Mencari...' : 'Cari' }}
              </button>
              <button
                v-else
                type="button"
                class="btn btn-outline-danger"
                :disabled="submitting"
                @click="clearMember"
              >
                Lepas
              </button>
            </div>
            <div
              v-if="lookupError"
              class="small text-danger mb-2"
            >
              {{ lookupError }}
            </div>
            <div
              v-if="member"
              class="alert alert-success py-2 small mb-3"
            >
              <strong>{{ member.name }}</strong><br>
              Saldo {{ rupiah(member.balance) }} &middot; Diskon {{ member.discount_pct }}%
            </div>

            <!-- Item -->
            <div
              v-if="cart.length === 0"
              class="text-center text-muted py-4"
            >
              Keranjang masih kosong.<br><small>Pilih produk di sebelah kiri.</small>
            </div>

            <div
              v-for="item in cart"
              :key="item.product_id"
              class="border-bottom pb-2 mb-2"
            >
              <div class="d-flex justify-content-between">
                <div>
                  <strong>{{ item.name }}</strong>
                  <div class="small text-muted">
                    {{ rupiah(item.price) }}
                  </div>
                </div>
                <strong class="text-primary">{{ rupiah(item.price * item.qty) }}</strong>
              </div>

              <div class="d-flex justify-content-between align-items-center mt-2">
                <div
                  class="btn-group btn-group-sm"
                  role="group"
                  :aria-label="'Jumlah ' + item.name"
                >
                  <button
                    type="button"
                    class="btn btn-outline-secondary"
                    :disabled="item.qty <= 1 || submitting"
                    @click="changeQty(item, -1)"
                  >
                    -
                  </button>
                  <span class="btn btn-light disabled fw-bold px-3">{{ item.qty }}</span>
                  <button
                    type="button"
                    class="btn btn-outline-secondary"
                    :disabled="item.qty >= 99 || submitting"
                    @click="changeQty(item, 1)"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  class="btn btn-link btn-sm text-danger p-0"
                  :disabled="submitting"
                  @click="removeFromCart(item)"
                >
                  Hapus
                </button>
              </div>

              <div
                v-if="item.category === 'PLAYGROUND'"
                class="mt-2"
              >
                <input
                  v-model="item.visitor_name"
                  type="text"
                  maxlength="60"
                  class="form-control form-control-sm"
                  :class="{ 'is-invalid': !item.visitor_name.trim() }"
                  placeholder="Nama anak / pengunjung (wajib)"
                  :disabled="submitting"
                >
              </div>
            </div>

            <!-- Total -->
            <div class="pt-2">
              <div class="d-flex justify-content-between text-muted">
                <span>Subtotal</span><span>{{ rupiah(cartSubtotal) }}</span>
              </div>
              <div
                v-if="discountAmount > 0"
                class="d-flex justify-content-between text-success"
              >
                <span>Diskon member ({{ member.discount_pct }}%)</span>
                <span>- {{ rupiah(discountAmount) }}</span>
              </div>
              <div class="d-flex justify-content-between align-items-center border-top pt-2 mt-2">
                <span class="fs-5 fw-bold">TOTAL</span>
                <span class="fs-4 fw-bold text-success">{{ rupiah(cartTotal) }}</span>
              </div>

              <button
                type="button"
                class="btn btn-success btn-lg w-100 mt-3"
                :disabled="!canCheckout"
                @click="openPayment"
              >
                Bayar {{ rupiah(cartTotal) }}
              </button>
              <div
                v-if="checkoutBlockReason"
                class="small text-muted text-center mt-2"
              >
                {{ checkoutBlockReason }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal pembayaran -->
    <div
      v-if="showPayment"
      class="pos-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-title"
    >
      <div class="card pos-dialog">
        <div class="card-header d-flex justify-content-between align-items-center">
          <strong id="payment-title">Pembayaran</strong>
          <button
            type="button"
            class="btn-close"
            aria-label="Tutup"
            :disabled="submitting"
            @click="closePayment"
          />
        </div>
        <div class="card-body">
          <div class="text-center p-3 mb-3 rounded bg-light border">
            <small class="text-muted text-uppercase">Total tagihan</small>
            <div class="fs-2 fw-bold text-success">
              {{ rupiah(cartTotal) }}
            </div>
          </div>

          <div class="row g-2 mb-3">
            <div
              v-for="m in paymentMethods"
              :key="m.value"
              class="col-6 col-md-3"
            >
              <button
                type="button"
                class="btn w-100"
                :class="paymentMethod === m.value ? 'btn-primary' : 'btn-outline-primary'"
                :disabled="submitting"
                @click="selectMethod(m.value)"
              >
                {{ m.label }}
              </button>
            </div>
          </div>

          <!-- Tunai -->
          <div v-if="paymentMethod === 'CASH'">
            <label
              class="form-label"
              for="cash-input"
            >Uang diterima</label>
            <input
              id="cash-input"
              v-model.number="cashGiven"
              type="number"
              min="0"
              step="500"
              class="form-control form-control-lg text-end mb-2"
              :class="{ 'is-invalid': cashGiven !== '' && cashGiven < cartTotal }"
              :disabled="submitting"
            >
            <div class="d-flex flex-wrap gap-2 mb-3">
              <button
                v-for="amount in quickCash"
                :key="amount"
                type="button"
                class="btn btn-outline-secondary btn-sm"
                :disabled="submitting"
                @click="cashGiven = amount"
              >
                {{ amount === cartTotal ? 'Uang Pas' : rupiah(amount) }}
              </button>
            </div>
            <div class="p-3 bg-light rounded border d-flex justify-content-between">
              <span>Kembalian</span>
              <strong :class="cashChange >= 0 ? 'text-primary' : 'text-danger'">
                {{ cashChange >= 0 ? rupiah(cashChange) : 'Uang kurang ' + rupiah(-cashChange) }}
              </strong>
            </div>
          </div>

          <!-- QRIS -->
          <div
            v-else-if="paymentMethod === 'QRIS'"
            class="p-3 bg-light rounded border text-center"
          >
            <p class="small text-muted mb-2">
              QRIS tampil di layar pelanggan. Konfirmasi hanya setelah dana masuk.
              <span class="badge bg-warning text-dark">Mode uji coba (sandbox)</span>
            </p>
            <div class="form-check d-inline-block text-start">
              <input
                id="qris-confirm"
                v-model="paymentConfirmed"
                type="checkbox"
                class="form-check-input"
                :disabled="submitting"
              >
              <label
                class="form-check-label"
                for="qris-confirm"
              >Pembayaran QRIS sudah diterima</label>
            </div>
          </div>

          <!-- Debit -->
          <div
            v-else-if="paymentMethod === 'DEBIT'"
            class="p-3 bg-light rounded border"
          >
            <div class="form-check">
              <input
                id="edc-confirm"
                v-model="paymentConfirmed"
                type="checkbox"
                class="form-check-input"
                :disabled="submitting"
              >
              <label
                class="form-check-label"
                for="edc-confirm"
              >Mesin EDC menampilkan status APPROVED</label>
            </div>
          </div>

          <!-- Saldo member -->
          <div
            v-else
            class="p-3 bg-light rounded border"
          >
            <template v-if="member">
              <div>Member: <strong>{{ member.name }}</strong></div>
              <div>Saldo: <strong>{{ rupiah(member.balance) }}</strong></div>
              <div :class="member.balance >= cartTotal ? 'text-success' : 'text-danger fw-bold'">
                {{ member.balance >= cartTotal ? 'Saldo cukup.' : 'Saldo tidak mencukupi.' }}
              </div>
            </template>
            <div
              v-else
              class="text-danger"
            >
              Cari member terlebih dahulu di panel keranjang untuk memakai saldo.
            </div>
          </div>

          <div
            v-if="submitError"
            class="alert alert-danger mt-3 mb-0"
            role="alert"
          >
            {{ submitError }}
          </div>

          <div class="d-flex justify-content-end gap-2 mt-4">
            <button
              type="button"
              class="btn btn-secondary"
              :disabled="submitting"
              @click="closePayment"
            >
              Batal
            </button>
            <button
              type="button"
              class="btn btn-play-sky px-4 fw-bold shadow-sm"
              :disabled="!canPay"
              @click="submitTransaction"
            >
              <span
                v-if="submitting"
                class="spinner-border spinner-border-sm me-1"
                aria-hidden="true"
              />
              {{ submitting ? 'Memproses...' : '✓ Selesaikan Transaksi' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Struk -->
    <div
      v-if="receipt"
      class="pos-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-title"
    >
      <div class="card pos-dialog pos-dialog-sm">
        <div class="card-body font-monospace small">
          <div class="text-center border-bottom pb-2 mb-2">
            <strong
              id="receipt-title"
              class="fs-6"
            >PLAYTOPIA PLAYGROUND &amp; CAFE</strong><br>
            <span class="text-muted">Struk (pratinjau 80mm)</span>
          </div>
          <div>No: <strong>{{ receipt.invoice_number }}</strong></div>
          <div>Waktu: {{ receiptTime }}</div>
          <div>Kasir: {{ auth.user?.name }}</div>
          <div class="mb-2">
            Bayar: {{ methodLabel(receipt.payment_method) }}
          </div>

          <table class="w-100 border-top border-bottom mb-2">
            <tbody>
              <tr
                v-for="(it, i) in receipt.items"
                :key="i"
              >
                <td>{{ it.name }} x{{ it.qty }}</td>
                <td class="text-end">
                  {{ rupiah(it.price * it.qty) }}
                </td>
              </tr>
            </tbody>
          </table>

          <div class="d-flex justify-content-between">
            <span>Subtotal</span><span>{{ rupiah(receipt.subtotal) }}</span>
          </div>
          <div
            v-if="receipt.discount > 0"
            class="d-flex justify-content-between"
          >
            <span>Diskon member</span><span>- {{ rupiah(receipt.discount) }}</span>
          </div>
          <div class="d-flex justify-content-between fw-bold">
            <span>TOTAL</span><span>{{ rupiah(receipt.total_amount) }}</span>
          </div>
          <template v-if="receipt.cash_received !== null">
            <div class="d-flex justify-content-between">
              <span>Tunai</span><span>{{ rupiah(receipt.cash_received) }}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>Kembali</span><span>{{ rupiah(receipt.change_amount) }}</span>
            </div>
          </template>

          <div
            v-if="receipt.tickets.length"
            class="border-top mt-3 pt-3 text-center"
          >
            <div class="badge bg-dark mb-2">
              TIKET MASUK (QR)
            </div>
            <div
              v-for="t in receipt.tickets"
              :key="t.ticket_code"
              class="border rounded p-2 mb-2"
            >
              <strong class="d-block">{{ t.visitor_name }}</strong>
              <span class="text-muted">{{ t.package_name }}</span>
              <div class="my-2">
                <QrImage
                  :value="t.qr_token"
                  :size="110"
                />
              </div>
              <div class="fw-bold">
                {{ t.ticket_code }}
              </div>
              <div class="text-muted">
                Toleransi {{ t.grace_period_minutes }} mnt &middot; Re-entry maks {{ t.max_reentry }}x
              </div>
            </div>
          </div>

          <div class="text-center text-muted mt-3">
            Terima kasih &amp; selamat bermain!
          </div>
        </div>
        <div class="card-footer text-end">
          <button
            type="button"
            class="btn btn-primary"
            @click="receipt = null"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { api } from '@/utils/posApi'
import { rupiah, fmtDateTime } from '@/utils/format'
import { usePosAuthStore } from '@/stores/posAuth'
import QrImage from '@/components/PosLayout/QrImage.vue'

const auth = usePosAuthStore()

const paymentMethods = [
  { value: 'CASH', label: 'Tunai' },
  { value: 'QRIS', label: 'QRIS' },
  { value: 'DEBIT', label: 'Kartu Debit' },
  { value: 'MEMBER_BALANCE', label: 'Saldo Member' }
]

// ---- data ----
const products = ref([])
const productsLoading = ref(true)
const shift = ref(null)
const shiftLoading = ref(true)
const loadError = ref('')
const activeVisitors = ref(0)

const selectedCategory = ref('ALL')
const cart = ref([])

const memberQuery = ref('')
const member = ref(null)
const lookupBusy = ref(false)
const lookupError = ref('')

const showPayment = ref(false)
const paymentMethod = ref('CASH')
const cashGiven = ref('')
const paymentConfirmed = ref(false)
const submitting = ref(false)
const submitError = ref('')
const receipt = ref(null)

let channel = null
let visitorsTimer = null

// ---- derived ----
const tabs = computed(() => [
  { value: 'ALL', label: 'Semua', count: products.value.length },
  { value: 'PLAYGROUND', label: 'Tiket Playground', count: products.value.filter(p => p.category === 'PLAYGROUND').length },
  { value: 'CAFE', label: 'Cafe & Snack', count: products.value.filter(p => p.category === 'CAFE').length }
])

const filteredProducts = computed(() =>
  selectedCategory.value === 'ALL'
    ? products.value
    : products.value.filter(p => p.category === selectedCategory.value)
)

const cartSubtotal = computed(() => cart.value.reduce((s, i) => s + i.price * i.qty, 0))
const discountAmount = computed(() =>
  member.value ? Math.round((cartSubtotal.value * (member.value.discount_pct || 0)) / 100) : 0
)
const cartTotal = computed(() => Math.max(0, cartSubtotal.value - discountAmount.value))
const cashChange = computed(() => (Number(cashGiven.value) || 0) - cartTotal.value)

const quickCash = computed(() => {
  const total = cartTotal.value
  const rounded = [50000, 100000, 200000].filter(v => v >= total)
  return [total, ...rounded]
})

const canEditCart = computed(() => !!shift.value && !submitting.value && !showPayment.value)
const missingVisitor = computed(() =>
  cart.value.some(i => i.category === 'PLAYGROUND' && !i.visitor_name.trim())
)

const checkoutBlockReason = computed(() => {
  if (!shift.value) return 'Buka shift terlebih dahulu.'
  if (cart.value.length === 0) return ''
  if (missingVisitor.value) return 'Isi nama pengunjung untuk semua tiket playground.'
  return ''
})
const canCheckout = computed(() =>
  !!shift.value && cart.value.length > 0 && !missingVisitor.value && cartTotal.value > 0 && !submitting.value
)

const canPay = computed(() => {
  if (submitting.value || !canCheckout.value) return false
  switch (paymentMethod.value) {
    case 'CASH': return Number(cashGiven.value) >= cartTotal.value
    case 'QRIS':
    case 'DEBIT': return paymentConfirmed.value
    case 'MEMBER_BALANCE': return !!member.value && member.value.balance >= cartTotal.value
    default: return false
  }
})

const receiptTime = computed(() => fmtDateTime(new Date()))
const methodLabel = (v) => paymentMethods.find(m => m.value === v)?.label || v

// ---- loaders ----
async function loadAll() {
  loadError.value = ''
  productsLoading.value = true
  shiftLoading.value = true
  try {
    const [p, s] = await Promise.all([api('/products'), api('/shifts/current')])
    products.value = p.data
    shift.value = s.data
  } catch (err) {
    loadError.value = err.message
  } finally {
    productsLoading.value = false
    shiftLoading.value = false
  }
}

async function loadVisitors() {
  try {
    const res = await api('/gate/active-tickets')
    activeVisitors.value = res.data.length
  } catch {
    // indikator saja; kegagalan tidak perlu mengganggu kasir
  }
}

// ---- cart ----
function addToCart(product) {
  if (!canEditCart.value) return
  const existing = cart.value.find(i => i.product_id === product.id)
  if (existing) {
    if (existing.qty < 99) existing.qty += 1
    return
  }
  cart.value.push({
    product_id: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    duration_minutes: product.duration_minutes,
    qty: 1,
    visitor_name: ''
  })
}

function changeQty(item, delta) {
  item.qty = Math.min(99, Math.max(1, item.qty + delta))
}

function removeFromCart(item) {
  cart.value = cart.value.filter(i => i !== item)
}

function clearCart() {
  cart.value = []
  clearMember()
}

// ---- member ----
async function lookupMember() {
  if (!memberQuery.value || lookupBusy.value) return
  lookupBusy.value = true
  lookupError.value = ''
  try {
    const res = await api(`/members/lookup/${encodeURIComponent(memberQuery.value)}`)
    member.value = res.data
  } catch (err) {
    lookupError.value = err.status === 404 ? 'Member tidak ditemukan.' : err.message
  } finally {
    lookupBusy.value = false
  }
}

function clearMember() {
  member.value = null
  memberQuery.value = ''
  lookupError.value = ''
}

// ---- payment ----
function openPayment() {
  if (!canCheckout.value) return
  paymentMethod.value = 'CASH'
  cashGiven.value = cartTotal.value
  paymentConfirmed.value = false
  submitError.value = ''
  showPayment.value = true
}

function closePayment() {
  if (submitting.value) return
  showPayment.value = false
}

function selectMethod(value) {
  paymentMethod.value = value
  paymentConfirmed.value = false
  submitError.value = ''
}

async function submitTransaction() {
  if (!canPay.value) return
  submitting.value = true
  submitError.value = ''
  try {
    const res = await api('/transactions', {
      method: 'POST',
      body: {
        customer_name: cart.value.find(i => i.category === 'PLAYGROUND')?.visitor_name.trim() || 'Pengunjung Umum',
        payment_method: paymentMethod.value,
        member_id: member.value?.id ?? null,
        cash_given: paymentMethod.value === 'CASH' ? Number(cashGiven.value) : undefined,
        items: cart.value.map(i => ({
          product_id: i.product_id,
          qty: i.qty,
          visitor_names: i.category === 'PLAYGROUND' ? [i.visitor_name.trim()] : []
        }))
      }
    })

    receipt.value = res.data
    showPayment.value = false
    channel?.postMessage({ type: 'PAYMENT_SUCCESS', invoice_number: res.data.invoice_number, total_amount: res.data.total_amount })

    cart.value = []
    clearMember()
    loadVisitors()
    // saldo / data produk bisa berubah -> sinkronkan shift
    api('/shifts/current').then(s => { shift.value = s.data }).catch(() => {})
  } catch (err) {
    submitError.value = err.message
  } finally {
    submitting.value = false
  }
}

// ---- layar pelanggan (dual screen) ----
function broadcastCart() {
  channel?.postMessage({
    type: 'UPDATE_CART',
    items: cart.value.map(i => ({ name: i.name, category: i.category, price: i.price, qty: i.qty, duration_minutes: i.duration_minutes })),
    customer_name: member.value?.name || '',
    total_amount: cartTotal.value,
    discount_amount: discountAmount.value,
    payment_method: showPayment.value ? paymentMethod.value : null,
    qris_data: showPayment.value && paymentMethod.value === 'QRIS' ? `PLAYTOPIA-QRIS-SANDBOX|${cartTotal.value}` : null
  })
}

function openCustomerDisplay() {
  window.open('/customer-display', 'CustomerFacingDisplay', 'width=1024,height=768')
  setTimeout(broadcastCart, 800)
}

watch([cart, member, paymentMethod, showPayment], broadcastCart, { deep: true })

onMounted(() => {
  if ('BroadcastChannel' in window) channel = new BroadcastChannel('pos_customer_display')
  loadAll()
  loadVisitors()
  visitorsTimer = setInterval(loadVisitors, 15000)
})

onUnmounted(() => {
  clearInterval(visitorsTimer)
  channel?.postMessage({ type: 'RESET_IDLE' })
  channel?.close()
})
</script>

<style scoped>
.product-card {
  cursor: pointer;
  min-height: 140px;
  border-width: 2px !important;
  border-radius: 14px;
  background: #fff;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 114, 156, 0.05);
}
.product-card:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(92, 210, 255, 0.25);
}
.product-card:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.product-playground {
  border-color: #5cd2ff !important;
}
.product-playground:hover:not(:disabled) {
  border-color: #00729c !important;
}

.product-cafe {
  border-color: #ff5cbc !important;
}
.product-cafe:hover:not(:disabled) {
  border-color: #99005b !important;
}

.nav-pills .nav-link {
  border-radius: 10px;
  font-weight: 600;
  color: #00729c;
  background-color: #eaf7fd;
  margin-right: 6px;
  transition: all 0.2s ease;
}
.nav-pills .nav-link.active {
  background: linear-gradient(135deg, #5cd2ff 0%, #00729c 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(92, 210, 255, 0.35);
}

.pos-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 44, 62, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 1050;
  overflow-y: auto;
}
.pos-dialog {
  width: 100%;
  max-width: 640px;
  max-height: 95vh;
  overflow-y: auto;
  border-radius: 16px;
}
.pos-dialog-sm {
  max-width: 420px;
  border-radius: 16px;
}
</style>
