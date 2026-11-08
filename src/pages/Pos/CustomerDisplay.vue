<template>
  <div class="cfd">

    <!-- ════════════════════════════════════════
         TOP BAR — selalu tampil di semua state
    ════════════════════════════════════════ -->
    <header class="cfd-topbar">
      <div class="topbar-brand">
        <img :src="PlaytopiaLogo" alt="Playtopia" class="topbar-logo" />
        <div class="topbar-brand-name">Playtopia Playground & Cafe</div>
      </div>
      <div class="topbar-meta">
        <span v-if="cashierName" class="topbar-cashier">Kasir: {{ cashierName }}</span>
        <span class="topbar-time">{{ currentTime }}</span>
      </div>
    </header>

    <!-- ════════════════════════════════════════
         STATE: IDLE
    ════════════════════════════════════════ -->
    <main v-if="state === 'IDLE'" class="state-idle">
      <div class="idle-logo-block">
        <img :src="PlaytopiaLogo" alt="Playtopia" class="idle-logo" />
        <div class="idle-tagline">Selamat Datang!</div>
        <div class="idle-sub">Playtopia Playground & Cafe — Senayan Park, Jakarta Selatan</div>
      </div>
      <div class="idle-promo-block">
        <div class="idle-promo-title">Paket Tersedia</div>
        <div class="idle-promo-grid">
          <div v-for="p in promoPackages" :key="p.name" class="idle-promo-card">
            <div class="promo-category">{{ p.category }}</div>
            <div class="promo-name">{{ p.name }}</div>
            <div class="promo-price">{{ rupiah(p.price) }}</div>
          </div>
        </div>
        <div class="idle-accept-label">Pembayaran: Tunai · QRIS · Kartu Debit · Saldo Member</div>
      </div>
    </main>

    <!-- ════════════════════════════════════════
         STATE: CART — Transaksi Berjalan
    ════════════════════════════════════════ -->
    <main v-else-if="state === 'CART' && !isQrisActive" class="state-cart">

      <!-- Kiri: Daftar Item -->
      <div class="cart-left">
        <table class="item-table">
          <thead>
            <tr>
              <th class="th-item">Item</th>
              <th class="th-qty">Qty</th>
              <th class="th-price">Harga</th>
              <th class="th-sub">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in items" :key="idx" class="item-row">
              <td class="td-item">
                <span class="item-name">{{ item.name }}</span>
                <span
                  class="item-badge"
                  :class="item.category === 'PLAYGROUND' ? 'badge-playground' : 'badge-cafe'"
                >{{ item.category === 'PLAYGROUND' ? 'Playground' : 'Cafe' }}</span>
              </td>
              <td class="td-qty">{{ item.qty }}</td>
              <td class="td-price">{{ formatNum(item.price) }}</td>
              <td class="td-sub">{{ formatNum(item.price * item.qty) }}</td>
            </tr>
            <tr v-if="items.length === 0" class="item-row-placeholder">
              <td colspan="4">Item pesanan akan muncul di sini...</td>
            </tr>
          </tbody>
        </table>

        <div class="cart-left-footer">
          <span>Mohon periksa pesanan Anda</span>
          <span class="payment-methods-hint">Tunai · QRIS · Debit · Saldo Member</span>
        </div>
      </div>

      <!-- Kanan: Member + Summary -->
      <div class="cart-right">

        <!-- Member info -->
        <div v-if="customerName" class="member-card">
          <div class="member-card-label">Member</div>
          <div class="member-card-name">{{ customerName }}</div>
          <div v-if="memberBalance !== null" class="member-card-balance">
            Saldo: {{ rupiah(memberBalance) }}
          </div>
        </div>

        <!-- Summary rows -->
        <div class="summary-block">
          <div class="summary-row">
            <span>Subtotal</span>
            <span>{{ formatNum(subtotal) }}</span>
          </div>
          <div v-if="discountAmount > 0" class="summary-row summary-disc">
            <span>Diskon Member {{ memberDiscountPct ? memberDiscountPct + '%' : '' }}</span>
            <span>-{{ formatNum(discountAmount) }}</span>
          </div>
          <div class="summary-divider" />
          <div class="summary-total-label">Total bayar</div>
          <div class="summary-total-amount">{{ rupiah(totalAmount) }}</div>
        </div>

      </div>
    </main>

    <!-- ════════════════════════════════════════
         STATE: QRIS — Menunggu Pembayaran
    ════════════════════════════════════════ -->
    <main v-else-if="state === 'CART' && isQrisActive" class="state-qris">

      <!-- Kiri: Ringkasan Pembayaran -->
      <div class="qris-left">
        <div class="qris-total-label">Total bayar</div>
        <div class="qris-total-amount">{{ rupiah(totalAmount) }}</div>
        <div class="qris-meta-rows">
          <div class="qris-meta-row">
            <span>Metode</span>
            <span>QRIS</span>
          </div>
          <div class="qris-meta-row">
            <span>Item</span>
            <span>{{ items.length }} item</span>
          </div>
          <div v-if="discountAmount > 0" class="qris-meta-row qris-meta-disc">
            <span>Diskon</span>
            <span>-{{ formatNum(discountAmount) }}</span>
          </div>
        </div>
      </div>

      <!-- Kanan: QR Code -->
      <div class="qris-right">
        <div class="qris-label">Scan dengan aplikasi e-wallet atau mobile banking</div>
        <div class="qris-code-wrap">
          <QrImage :value="qrisData" :size="210" alt="QRIS" />
        </div>
        <div class="qris-waiting">Menunggu pembayaran...</div>
      </div>

    </main>

    <!-- ════════════════════════════════════════
         STATE: SUCCESS — Pembayaran Berhasil
    ════════════════════════════════════════ -->
    <main v-else-if="state === 'SUCCESS'" class="state-success">

      <!-- Kiri: Hasil Transaksi -->
      <div class="success-left">
        <div class="success-title">Pembayaran berhasil</div>
        <div v-if="successCashGiven" class="success-paid">
          Dibayar {{ rupiah(successCashGiven) }}
        </div>
        <div v-if="successCashChange !== null && successCashChange >= 0" class="success-change">
          Kembalian {{ rupiah(successCashChange) }}
        </div>
        <div class="success-thanks">Terima kasih, selamat bermain!</div>
      </div>

      <!-- Kanan: Logo + Promo idle -->
      <div class="success-right">
        <img :src="PlaytopiaLogo" alt="Playtopia" class="success-logo" />
        <div class="success-promo-banner">
          <div class="success-promo-text">Bermain seru, aman, dan nyaman</div>
          <div class="success-promo-sub">bersama keluarga di Playtopia</div>
        </div>
        <div class="success-welcome">Selamat datang kembali!</div>
      </div>

    </main>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { rupiah } from '@/utils/format'
import QrImage from '@/components/PosLayout/QrImage.vue'
import PlaytopiaLogo from '@/assets/playtopia-logo.png'

// ── State ──────────────────────────────────────────────
const state = ref('IDLE')           // IDLE | CART | SUCCESS
const items = ref([])
const customerName = ref('')
const memberBalance = ref(null)
const memberDiscountPct = ref(null)
const subtotal = ref(0)
const totalAmount = ref(0)
const discountAmount = ref(0)
const paymentMethod = ref(null)
const qrisData = ref(null)
const cashierName = ref('')

// SUCCESS state data
const successCashGiven = ref(null)
const successCashChange = ref(null)

// Clock
const currentTime = ref('')
let clock = null
let idleTimer = null
let channel = null

// ── Computed ───────────────────────────────────────────
const isQrisActive = computed(
  () => paymentMethod.value === 'QRIS' && !!qrisData.value
)

// ── Idle promo packages ────────────────────────────────
const promoPackages = [
  { category: 'Playground', name: 'Paket 1 Jam', price: 50000 },
  { category: 'Playground', name: 'Paket 2 Jam', price: 90000 },
  { category: 'Playground', name: 'Paket Member', price: 70000 },
  { category: 'Cafe', name: 'Paket Combo Anak', price: 35000 },
  { category: 'Cafe', name: 'Es Teh Manis', price: 12000 },
  { category: 'Cafe', name: 'Nugget & Fries', price: 28000 },
]

// ── Helpers ────────────────────────────────────────────
/** Angka tanpa "Rp", e.g. 144.800 */
function formatNum(value) {
  const n = Number(value)
  return Number.isFinite(n)
    ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)
    : '0'
}

function tick() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit'
  })
}

function goIdle() {
  state.value = 'IDLE'
  items.value = []
  customerName.value = ''
  memberBalance.value = null
  memberDiscountPct.value = null
  subtotal.value = 0
  totalAmount.value = 0
  discountAmount.value = 0
  paymentMethod.value = null
  qrisData.value = null
  successCashGiven.value = null
  successCashChange.value = null
}

function handleMessage({ data }) {
  if (data.type === 'UPDATE_CART') {
    clearTimeout(idleTimer)
    items.value          = data.items || []
    customerName.value   = data.customer_name || ''
    memberBalance.value  = data.member_balance ?? null
    memberDiscountPct.value = data.member_discount_pct ?? null
    subtotal.value       = data.subtotal ?? data.total_amount ?? 0
    totalAmount.value    = data.total_amount || 0
    discountAmount.value = data.discount_amount || 0
    paymentMethod.value  = data.payment_method || null
    qrisData.value       = data.qris_data || null
    cashierName.value    = data.cashier_name || ''
    state.value          = items.value.length ? 'CART' : 'IDLE'

  } else if (data.type === 'PAYMENT_SUCCESS') {
    state.value            = 'SUCCESS'
    totalAmount.value      = data.total_amount ?? totalAmount.value
    successCashGiven.value = data.cash_given ?? null
    successCashChange.value= data.cash_change ?? null
    cashierName.value      = data.cashier_name || cashierName.value
    clearTimeout(idleTimer)
    idleTimer = setTimeout(goIdle, 8000)

  } else if (data.type === 'RESET_IDLE') {
    goIdle()
  }
}

onMounted(() => {
  tick()
  clock = setInterval(tick, 1000)
  if ('BroadcastChannel' in window) {
    channel = new BroadcastChannel('pos_customer_display')
    channel.onmessage = handleMessage
  }
})

onUnmounted(() => {
  clearInterval(clock)
  clearTimeout(idleTimer)
  channel?.close()
})
</script>

<style scoped>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ══════════════════════════════════
   ROOT
══════════════════════════════════ */
.cfd {
  height: 100vh;
  width: 100vw;
  background: #07091a;
  color: #f1f5f9;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
}

/* ══════════════════════════════════
   TOP BAR
══════════════════════════════════ */
.cfd-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  height: 52px;
  flex-shrink: 0;
  background: linear-gradient(90deg, #0d1535 0%, #150d2e 100%);
  border-bottom: 2px solid;
  border-image: linear-gradient(90deg, #0ea5e9, #ec4899) 1;
}

.topbar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topbar-logo {
  height: 28px;
  object-fit: contain;
}

.topbar-brand-name {
  font-size: 13px;
  font-weight: 600;
  color: #cbd5e1;
  letter-spacing: 0.2px;
}

.topbar-meta {
  display: flex;
  align-items: center;
  gap: 20px;
}

.topbar-cashier {
  font-size: 13px;
  color: rgba(255,255,255,0.4);
}

.topbar-time {
  font-size: 20px;
  font-weight: 800;
  color: #e2e8f0;
  font-variant-numeric: tabular-nums;
  letter-spacing: 1.5px;
}

/* ══════════════════════════════════
   IDLE
══════════════════════════════════ */
.state-idle {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
}

.idle-logo-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 48px 48px;
  gap: 12px;
  border-right: 1px solid rgba(255,255,255,0.07);
  background: linear-gradient(160deg, #0d1535 0%, #150d2e 100%);
}

.idle-logo {
  height: 56px;
  object-fit: contain;
  margin-bottom: 16px;
}

.idle-tagline {
  font-size: clamp(36px, 5vw, 60px);
  font-weight: 800;
  background: linear-gradient(135deg, #38bdf8, #f472b6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -1px;
  line-height: 1;
}

.idle-sub {
  font-size: 15px;
  color: rgba(255,255,255,0.4);
  line-height: 1.5;
}

.idle-promo-block {
  display: flex;
  flex-direction: column;
  padding: 32px 36px;
  gap: 16px;
  overflow: hidden;
  background: #07091a;
}

.idle-promo-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.3);
}

.idle-promo-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  flex: 1;
}

.idle-promo-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 10px;
  padding: 14px 16px;
}

.promo-category {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.3);
  margin-bottom: 4px;
}

.promo-name {
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 4px;
}

.promo-price {
  font-size: 16px;
  font-weight: 800;
  background: linear-gradient(90deg, #38bdf8, #f472b6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.idle-accept-label {
  font-size: 12px;
  color: rgba(255,255,255,0.25);
  margin-top: 4px;
}

/* ══════════════════════════════════
   CART
══════════════════════════════════ */
.state-cart {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 320px;
  overflow: hidden;
}

/* ── Kiri: Item Table ── */
.cart-left {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid rgba(255,255,255,0.08);
  background: #07091a;
}

.item-table {
  width: 100%;
  border-collapse: collapse;
  flex: 1;
}

.item-table thead tr {
  background: rgba(14,165,233,0.06);
  border-bottom: 1px solid rgba(14,165,233,0.15);
}

.item-table thead th {
  padding: 14px 20px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.3);
}

.th-item  { text-align: left; }
.th-qty   { text-align: center; width: 60px; }
.th-price { text-align: right; width: 110px; }
.th-sub   { text-align: right; width: 120px; padding-right: 24px !important; }

.item-row {
  border-bottom: 1px solid rgba(255,255,255,0.04);
}

.item-row:last-child { border-bottom: none; }

.td-item {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.td-qty, .td-price, .td-sub {
  padding: 16px 12px;
  vertical-align: middle;
}

.td-qty   { text-align: center; font-size: 16px; font-weight: 700; color: #94a3b8; }
.td-price { text-align: right;  font-size: 15px; color: rgba(255,255,255,0.35); }
.td-sub   { text-align: right;  font-size: 16px; font-weight: 700; color: #e2e8f0; padding-right: 24px; }

.item-name {
  font-size: 17px;
  font-weight: 600;
  color: #f1f5f9;
}

.item-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 5px;
  flex-shrink: 0;
}

.badge-playground {
  background: rgba(14,165,233,0.15);
  color: #38bdf8;
  border: 1px solid rgba(14,165,233,0.3);
}

.badge-cafe {
  background: rgba(236,72,153,0.15);
  color: #f472b6;
  border: 1px solid rgba(236,72,153,0.3);
}

.item-row-placeholder td {
  padding: 24px 20px;
  font-size: 14px;
  color: rgba(255,255,255,0.2);
  font-style: italic;
}

.cart-left-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-top: 1px solid rgba(255,255,255,0.06);
  font-size: 12px;
  color: rgba(255,255,255,0.2);
  background: rgba(14,165,233,0.03);
}

/* ── Kanan: Member + Summary ── */
.cart-right {
  display: flex;
  flex-direction: column;
  background: #0d1535;
  overflow: hidden;
}

.member-card {
  padding: 20px 20px;
  border-bottom: 1px solid rgba(14,165,233,0.15);
  flex-shrink: 0;
  background: rgba(14,165,233,0.06);
}

.member-card-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #38bdf8;
  margin-bottom: 4px;
}

.member-card-name {
  font-size: 18px;
  font-weight: 700;
  color: #e2e8f0;
  margin-bottom: 2px;
}

.member-card-balance {
  font-size: 13px;
  color: rgba(255,255,255,0.4);
}

.summary-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px 20px;
  gap: 10px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: rgba(255,255,255,0.45);
}

.summary-disc {
  color: #34d399;
}

.summary-divider {
  height: 1px;
  background: rgba(255,255,255,0.08);
  margin: 4px 0;
}

.summary-total-label {
  font-size: 12px;
  color: rgba(255,255,255,0.3);
  margin-top: 4px;
}

.summary-total-amount {
  font-size: clamp(26px, 3.5vw, 38px);
  font-weight: 900;
  background: linear-gradient(135deg, #38bdf8, #f472b6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.5px;
  line-height: 1.1;
}

/* ══════════════════════════════════
   QRIS
══════════════════════════════════ */
.state-qris {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
}

.qris-left {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 48px 44px;
  border-right: 1px solid rgba(255,255,255,0.08);
  gap: 8px;
  background: #07091a;
}

.qris-total-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: rgba(255,255,255,0.3);
  margin-bottom: 4px;
}

.qris-total-amount {
  font-size: clamp(36px, 5vw, 60px);
  font-weight: 900;
  background: linear-gradient(135deg, #38bdf8, #f472b6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -1px;
  line-height: 1;
  margin-bottom: 24px;
}

.qris-meta-rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.qris-meta-row {
  display: flex;
  justify-content: space-between;
  font-size: 15px;
  color: rgba(255,255,255,0.45);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding-bottom: 10px;
}

.qris-meta-row span:last-child {
  font-weight: 700;
  color: #e2e8f0;
}

.qris-meta-disc span:last-child { color: #34d399; }

.qris-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  gap: 16px;
  background: #0d1535;
}

.qris-label {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255,255,255,0.5);
  text-align: center;
}

.qris-code-wrap {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  border: 2px solid rgba(236,72,153,0.3);
  box-shadow: 0 0 32px rgba(14,165,233,0.15), 0 0 32px rgba(236,72,153,0.1);
}

.qris-waiting {
  font-size: 13px;
  color: rgba(255,255,255,0.3);
  font-style: italic;
}

/* ══════════════════════════════════
   SUCCESS
══════════════════════════════════ */
.state-success {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
}

.success-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 48px 44px;
  border-right: 1px solid rgba(255,255,255,0.08);
  gap: 8px;
  background: #07091a;
}

.success-title {
  font-size: clamp(28px, 3.5vw, 44px);
  font-weight: 800;
  background: linear-gradient(135deg, #38bdf8, #f472b6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.5px;
  line-height: 1.1;
  margin-bottom: 4px;
}

.success-paid {
  font-size: 16px;
  color: rgba(255,255,255,0.4);
}

.success-change {
  font-size: clamp(24px, 3vw, 36px);
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.5px;
  margin-top: 4px;
}

.success-thanks {
  font-size: 15px;
  color: rgba(255,255,255,0.35);
  margin-top: 12px;
}

.success-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: #0d1535;
  gap: 20px;
}

.success-logo {
  height: 52px;
  object-fit: contain;
}

.success-promo-banner {
  background: linear-gradient(135deg, rgba(14,165,233,0.12), rgba(236,72,153,0.12));
  border: 1px solid rgba(14,165,233,0.25);
  border-radius: 12px;
  padding: 20px 32px;
  text-align: center;
  width: 100%;
}

.success-promo-text {
  font-size: 20px;
  font-weight: 700;
  color: #e2e8f0;
  margin-bottom: 4px;
}

.success-promo-sub {
  font-size: 14px;
  color: rgba(255,255,255,0.4);
}

.success-welcome {
  font-size: 14px;
  color: rgba(255,255,255,0.3);
}
</style>
