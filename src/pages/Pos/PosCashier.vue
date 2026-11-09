<template>
  <div class="pos-cashier">
    <!-- Layar Kasir Interaktif (disembunyikan saat mencetak struk) -->
    <div class="pos-cashier-screen d-print-none">
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
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <ul class="nav nav-pills mb-0">
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
              <div style="min-width: 220px;">
                <input
                  v-model.trim="searchQuery"
                  type="search"
                  class="form-control form-control-sm"
                  placeholder="Cari paket atau menu..."
                >
              </div>
            </div>

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
              Tidak ada produk yang cocok.
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
                  class="product-card card h-100 w-100 text-start position-relative"
                  :class="p.category === 'PLAYGROUND' ? 'product-playground' : 'product-cafe'"
                  :disabled="!canEditCart"
                  @click="addToCart(p)"
                >
                  <span class="card-body d-flex flex-column justify-content-between p-3">
                    <span>
                      <span class="d-flex justify-content-between align-items-center mb-2 gap-1">
                        <span
                          class="badge"
                          :class="p.category === 'PLAYGROUND' ? 'badge-play-sky' : 'badge-play-pink'"
                        >{{ p.category === 'PLAYGROUND' ? 'Playground' : 'Cafe F&B' }}</span>
                        <span
                          v-if="p.category === 'PLAYGROUND'"
                          class="badge fw-bold"
                          :class="p.is_open_play ? 'badge-play-violet' : 'badge-play-amber'"
                        >{{ p.is_open_play ? 'Sepuasnya' : p.duration_minutes + ' mnt' }}</span>
                      </span>
                      <span class="d-block fw-bold text-dark fs-6">{{ p.name }}</span>
                      <span class="d-block small text-muted mt-1">{{ p.description }}</span>
                    </span>
                    <span class="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                      <span class="fs-5 fw-bold text-primary">{{ rupiah(p.price) }}</span>
                      <span
                        v-if="getCartQty(p.id) > 0"
                        class="badge bg-success rounded-pill px-2 py-1"
                      >✓ {{ getCartQty(p.id) }}x di Keranjang</span>
                      <span
                        v-else
                        class="badge badge-play-sky rounded-pill px-2 py-1"
                      >+ Tambah</span>
                    </span>
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
          <div class="card-header card-header-sky d-flex justify-content-between align-items-center py-3">
            <strong class="d-flex align-items-center gap-2">
              <span>Keranjang Transaksi</span>
              <span v-if="cart.length" class="badge bg-white text-primary rounded-pill">{{ cart.length }} item</span>
            </strong>
            <button
              type="button"
              class="btn btn-light btn-sm fw-bold text-danger"
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
    </div> <!-- /pos-cashier-screen d-print-none -->

    <!-- Struk -->
    <div
      v-if="receipt"
      class="pos-backdrop pos-receipt-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-title"
    >
      <div class="card pos-dialog pos-dialog-sm receipt-dialog" id="receipt-print-area">
        <div class="card-body font-monospace receipt-body">
          <!-- Header Brand Struk -->
          <div class="receipt-header text-center pb-1">
            <h5 id="receipt-title" class="fw-bold mb-0 receipt-brand">
              PLAYTOPIA
            </h5>
            <div class="fw-semibold text-uppercase receipt-sub-brand" style="font-size: 11px; letter-spacing: 1px;">
              Playground &amp; Cafe
            </div>
            <div class="text-muted receipt-sub" style="font-size: 11px;">
              Senayan Park · Lantai 2 · Jakarta Pusat
            </div>
            <div class="text-muted receipt-sub" style="font-size: 10px;">
              Telp: (021) 5790-1234 &middot; IG: @playtopia.id
            </div>
            <div class="receipt-doc-title mt-1 fw-bold text-uppercase" style="font-size: 11px; letter-spacing: 0.5px;">
              STRUK PEMBELIAN &amp; TIKET AKSES
            </div>
          </div>

          <div class="receipt-dashed-divider" />

          <!-- Metadata Struk -->
          <div class="receipt-meta" style="font-size: 11.5px;">
            <div class="d-flex justify-content-between">
              <span class="text-muted">No. Transaksi</span>
              <strong class="text-dark">{{ receipt.invoice_number }}</strong>
            </div>
            <div class="d-flex justify-content-between">
              <span class="text-muted">Waktu</span>
              <span>{{ receiptTime }}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span class="text-muted">Kasir</span>
              <span>{{ auth.user?.name || 'Kasir Utama' }}</span>
            </div>
            <div class="d-flex justify-content-between">
              <span class="text-muted">Metode Bayar</span>
              <strong class="text-dark">{{ methodLabel(receipt.payment_method) }}</strong>
            </div>
          </div>

          <div class="receipt-dashed-divider" />

          <!-- Daftar Item Pembelian -->
          <div class="receipt-items-list mb-1" style="font-size: 11.5px;">
            <div
              v-for="(it, i) in receipt.items"
              :key="i"
              class="receipt-item-row py-1"
            >
              <div class="d-flex justify-content-between align-items-baseline">
                <span class="fw-semibold text-dark">{{ it.name }}</span>
                <span class="fw-bold">{{ rupiah(it.price * it.qty) }}</span>
              </div>
              <div class="text-muted" style="font-size: 11px;">
                {{ it.qty }}x @ {{ rupiah(it.price) }}
              </div>
            </div>
          </div>

          <div class="receipt-dashed-divider" />

          <!-- Kalkulasi Pembayaran -->
          <div class="receipt-calc" style="font-size: 12px;">
            <div class="d-flex justify-content-between py-1">
              <span>Subtotal</span>
              <span>{{ rupiah(receipt.subtotal) }}</span>
            </div>
            <div
              v-if="receipt.discount > 0"
              class="d-flex justify-content-between py-1 text-success"
            >
              <span>Diskon Member</span>
              <span>- {{ rupiah(receipt.discount) }}</span>
            </div>
            <div class="receipt-dashed-divider my-1" />
            <div class="d-flex justify-content-between py-1 fw-bold fs-6 text-dark">
              <span>TOTAL</span>
              <span>{{ rupiah(receipt.total_amount) }}</span>
            </div>
            <template v-if="receipt.cash_received !== null">
              <div class="d-flex justify-content-between py-1">
                <span class="text-muted">Tunai Diterima</span>
                <span>{{ rupiah(receipt.cash_received) }}</span>
              </div>
              <div class="d-flex justify-content-between py-1 fw-bold">
                <span class="text-muted">Kembalian</span>
                <span>{{ rupiah(receipt.change_amount) }}</span>
              </div>
            </template>
          </div>

          <!-- Bagian Tiket Masuk (QR Code) - BERSIH TANPA EMOJI -->
          <div
            v-if="receipt.tickets && receipt.tickets.length"
            class="receipt-tickets-section mt-2 text-center"
          >
            <div class="receipt-dashed-divider" />
            <div class="receipt-ticket-title-badge my-1">
              TIKET MASUK PLAYGROUND
            </div>
            <div
              v-for="t in receipt.tickets"
              :key="t.ticket_code"
              class="receipt-ticket-card p-2 my-2 text-center"
            >
              <div class="receipt-ticket-visitor fw-bold text-dark fs-6">{{ t.visitor_name }}</div>
              <div class="receipt-ticket-pkg text-muted small">{{ t.package_name }}</div>
              <div class="my-2 d-flex justify-content-center">
                <QrImage
                  :value="t.qr_token"
                  :size="125"
                />
              </div>
              <div class="fw-bold font-monospace receipt-ticket-code">
                {{ t.ticket_code }}
              </div>
              <div class="text-muted small mt-1" style="font-size: 11px;">
                Toleransi {{ t.grace_period_minutes }} mnt &middot; Re-entry maks {{ t.max_reentry }}x
              </div>
              <div class="text-muted mt-1 fst-italic" style="font-size: 10px;">
                Pindai QR ini pada mesin turnstile / gate masuk
              </div>
            </div>
          </div>

          <div class="receipt-dashed-divider" />

          <!-- Footer Struk -->
          <div class="text-center text-muted receipt-footer mt-2" style="font-size: 11px;">
            <div class="fw-semibold text-dark">Terima kasih atas kunjungan Anda!</div>
            <div>Simpan struk ini sebagai tiket &amp; bukti pembayaran yang sah.</div>
            <div class="receipt-footer-hash mt-1 text-uppercase" style="font-size: 9.5px; letter-spacing: 0.5px;">
              *** PLAYTOPIA POS SYSTEM · LISENSI RESMI ***
            </div>
          </div>
        </div>
        <div class="card-footer text-end d-flex justify-content-end gap-2 d-print-none bg-white border-top">
          <button
            type="button"
            class="btn btn-outline-secondary d-flex align-items-center gap-1"
            title="Cetak struk ke printer thermal (58mm/80mm) atau simpan PDF"
            @click="printReceipt"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>Cetak Struk</span>
          </button>
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

// State
const products = ref([])
const productsLoading = ref(true)
const shift = ref(null)
const shiftLoading = ref(true)
const loadError = ref('')
const activeVisitors = ref(0)

const selectedCategory = ref('ALL')
const searchQuery = ref('')
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

// Computed
const tabs = computed(() => [
  { value: 'ALL', label: 'Semua', count: products.value.length },
  { value: 'PLAYGROUND', label: 'Tiket Playground', count: products.value.filter(p => p.category === 'PLAYGROUND').length },
  { value: 'CAFE', label: 'Cafe & Snack', count: products.value.filter(p => p.category === 'CAFE').length }
])

const filteredProducts = computed(() => {
  const byCat = selectedCategory.value === 'ALL'
    ? products.value
    : products.value.filter(p => p.category === selectedCategory.value)
  if (!searchQuery.value) return byCat
  const q = searchQuery.value.toLowerCase()
  return byCat.filter(p =>
    String(p.name || '').toLowerCase().includes(q) ||
    String(p.description || '').toLowerCase().includes(q)
  )
})

function getCartQty(productId) {
  const item = cart.value.find(i => i.product_id === productId)
  return item ? item.qty : 0
}

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

// Data loaders
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
    
  }
}

// Cart
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

// Member
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

// Payment
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
    channel?.postMessage({
      type: 'PAYMENT_SUCCESS',
      invoice_number: res.data.invoice_number,
      total_amount: res.data.total_amount,
      cash_given: paymentMethod.value === 'CASH' ? (Number(cashGiven.value) || 0) : null,
      cash_change: paymentMethod.value === 'CASH' ? Math.max(0, cashChange.value) : null,
      payment_method: paymentMethod.value
    })

    cart.value = []
    clearMember()
    loadVisitors()
    // Sync shift
    api('/shifts/current').then(s => { shift.value = s.data }).catch(() => {})
  } catch (err) {
    submitError.value = err.message
  } finally {
    submitting.value = false
  }
}

// Customer display
function broadcastCart() {
  channel?.postMessage({
    type: 'UPDATE_CART',
    items: cart.value.map(i => ({ name: i.name, category: i.category, price: i.price, qty: i.qty, duration_minutes: i.duration_minutes })),
    customer_name: member.value?.name || '',
    member_balance: member.value?.balance ?? null,
    member_discount_pct: member.value?.discount_pct ?? null,
    subtotal: cartSubtotal.value,
    total_amount: cartTotal.value,
    discount_amount: discountAmount.value,
    payment_method: showPayment.value ? paymentMethod.value : null,
    cash_given: showPayment.value && paymentMethod.value === 'CASH' ? (Number(cashGiven.value) || 0) : null,
    cash_change: showPayment.value && paymentMethod.value === 'CASH' ? Math.max(0, cashChange.value) : null,
    qris_data: showPayment.value && paymentMethod.value === 'QRIS' ? `PLAYTOPIA-QRIS-SANDBOX|${cartTotal.value}` : null,
    cashier_name: auth.user?.name || 'Kasir'
  })
}

function openCustomerDisplay() {
  window.open('/customer-display', 'CustomerFacingDisplay', 'width=1024,height=768')
  setTimeout(broadcastCart, 800)
}

function printReceipt() {
  window.print()
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

/* Struk Modal & Card Styling */
.receipt-dialog {
  max-width: 400px;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 10px 40px rgba(0, 44, 62, 0.25);
  border: 1px solid #d0e8f2;
}

.receipt-body {
  padding: 1.25rem 1.25rem 1rem 1.25rem;
  color: #1a202c;
  line-height: 1.35;
}

.receipt-brand {
  color: #00729c;
  letter-spacing: 1.5px;
}

.receipt-sub-brand {
  color: #004a66;
}

.receipt-dashed-divider {
  border-top: 1px dashed #cbd5e1;
  margin: 8px 0;
}

.receipt-ticket-title-badge {
  display: inline-block;
  background-color: #00729c;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.8px;
  padding: 4px 12px;
  border-radius: 4px;
  text-transform: uppercase;
}

.receipt-ticket-card {
  border: 1.5px dashed #00729c;
  border-radius: 8px;
  background-color: #f7fcfe;
  transition: background-color 0.15s ease;
}

.receipt-ticket-code {
  font-size: 13px;
  letter-spacing: 1.2px;
  color: #002c3e;
}

.receipt-footer-hash {
  color: #94a3b8;
}
</style>
