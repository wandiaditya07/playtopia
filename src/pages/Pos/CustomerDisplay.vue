<template>
  <div class="cfd">
    <!-- ════════════════════════════════════════
         TOP BAR — Selalu tampil di semua state
    ════════════════════════════════════════ -->
    <header class="cfd-topbar">
      <div class="topbar-brand">
        <div class="topbar-logo-badge">
          <img :src="PlaytopiaLogo" alt="Playtopia" class="topbar-logo" />
        </div>
        <div class="topbar-title-group">
          <div class="topbar-brand-name">Playtopia Playground &amp; Cafe</div>
          <div class="topbar-brand-sub">Senayan Park, Jakarta Pusat</div>
        </div>
      </div>

      <div class="topbar-meta">
        <div v-if="cashierName" class="topbar-cashier-pill">
          <span class="text-muted">Kasir:</span>
          <strong>{{ cashierName }}</strong>
        </div>
        <div class="topbar-time-pill">
          <span class="time-dot" />
          <span class="topbar-time">{{ currentTime }}</span>
        </div>
      </div>
    </header>

    <!-- ════════════════════════════════════════
         STATE 0: IDLE (Standby / Menunggu Pelanggan)
    ════════════════════════════════════════ -->
    <main v-if="state === 'IDLE'" class="state-container state-idle">
      <div class="idle-hero-card">
        <div class="idle-brand-box">
          <img :src="PlaytopiaLogo" alt="Playtopia Logo" class="idle-logo" />
          <h1 class="idle-headline">Selamat Datang!</h1>
          <p class="idle-desc">
            Wahana bermain anak dan cafe keluarga paling seru, aman, dan nyaman di Playtopia.
          </p>
        </div>

        <div class="idle-features">
          <div class="idle-feat-pill">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#00c2cb" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Area Bersih &amp; Steril</span>
          </div>
          <div class="idle-feat-pill">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff4f81" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
            </svg>
            <span>Smart Turnstile Gate</span>
          </div>
          <div class="idle-feat-pill">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>Cafe &amp; Snack Bar</span>
          </div>
        </div>
      </div>

      <div class="idle-catalog-card">
        <div class="card-header-clean d-flex justify-content-between align-items-center">
          <span class="card-title-text">Paket Tiket &amp; Pilihan Populer</span>
          <span class="card-tag-pill">Playtopia Senayan</span>
        </div>

        <div class="idle-packages-grid">
          <div v-for="p in promoPackages" :key="p.name" class="idle-package-item">
            <div class="pkg-top d-flex justify-content-between align-items-center">
              <span class="pkg-category-badge" :class="p.category === 'Playground' ? 'badge-playground' : 'badge-cafe'">
                {{ p.category }}
              </span>
              <span class="pkg-duration text-muted">{{ p.desc || 'Tiket' }}</span>
            </div>
            <div class="pkg-name">{{ p.name }}</div>
            <div class="pkg-price">{{ rupiah(p.price) }}</div>
          </div>
        </div>

        <div class="idle-footer-note">
          <span class="text-muted">Metode Pembayaran Resmi:</span>
          <strong class="text-light">Tunai · QRIS All Bank / E-Wallet · Kartu Debit / Kredit · Saldo Member</strong>
        </div>
      </div>
    </main>

    <!-- ════════════════════════════════════════
         STATE 1: TRANSAKSI BERJALAN (Cart Input Real-Time)
    ════════════════════════════════════════ -->
    <main v-else-if="state === 'CART' && !isQrisActive" class="state-container state-cart">
      <!-- Kolom Kiri: Tabel Daftar Item Pesanan -->
      <section class="cfd-panel cart-items-panel">
        <div class="panel-header-clean d-flex justify-content-between align-items-center">
          <div class="d-flex align-items-center gap-2">
            <span class="panel-dot" />
            <span class="fw-semibold text-white">Rincian Pesanan</span>
          </div>
          <span class="panel-item-count">{{ totalItemCount }} Item Terpilih</span>
        </div>

        <div class="table-scroll-area">
          <table class="cfd-table">
            <thead>
              <tr>
                <th style="min-width: 230px;">Item</th>
                <th class="text-center" style="width: 70px;">Qty</th>
                <th class="text-end" style="width: 120px;">Harga</th>
                <th class="text-end" style="width: 130px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in items" :key="idx" class="cfd-row">
                <td>
                  <div class="item-name-line">
                    <span class="item-title">{{ item.name }}</span>
                    <span
                      class="category-pill"
                      :class="item.category === 'PLAYGROUND' ? 'pill-playground' : 'pill-cafe'"
                    >
                      {{ item.category === 'PLAYGROUND' ? 'Playground' : 'Cafe' }}
                    </span>
                  </div>
                  <div v-if="item.duration_minutes" class="item-sub-meta">
                    Durasi: {{ item.duration_minutes }} Menit
                  </div>
                </td>
                <td class="text-center">
                  <span class="qty-badge">{{ item.qty }}</span>
                </td>
                <td class="text-end font-numeric">{{ formatNum(item.price) }}</td>
                <td class="text-end font-numeric fw-semibold text-white">
                  {{ formatNum(item.price * item.qty) }}
                </td>
              </tr>

              <tr v-if="items.length === 0" class="empty-cart-row">
                <td colspan="4" class="text-center text-muted py-5">
                  Item pesanan akan muncul di sini secara langsung saat kasir memilih...
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="cart-notice-bar d-flex justify-content-between align-items-center">
          <span class="notice-text">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Mohon periksa pesanan Anda
          </span>
          <span class="payment-hint">Tunai · QRIS · Debit · Kredit</span>
        </div>
      </section>

      <!-- Kolom Kanan: Info Member & Total Tagihan -->
      <aside class="cfd-panel cart-summary-panel d-flex flex-column justify-content-between">
        <div>
          <!-- Member Card (jika member aktif) -->
          <div v-if="customerName" class="cfd-member-card mb-3">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="member-label">MEMBER TERVERIFIKASI</span>
              <span class="member-tag">Aktif</span>
            </div>
            <div class="member-name">{{ customerName }}</div>
            <div v-if="memberBalance !== null" class="member-balance mt-1">
              Saldo: <strong>{{ rupiah(memberBalance) }}</strong>
            </div>
          </div>

          <!-- Rincian Biaya -->
          <div class="summary-breakdown">
            <div class="breakdown-row">
              <span class="text-muted">Subtotal</span>
              <span class="font-numeric">{{ formatNum(subtotal) }}</span>
            </div>

            <div v-if="discountAmount > 0" class="breakdown-row discount">
              <span>Diskon Member {{ memberDiscountPct ? memberDiscountPct + '%' : '' }}</span>
              <span class="font-numeric">-{{ formatNum(discountAmount) }}</span>
            </div>

            <div v-if="voucherDiscount > 0" class="breakdown-row voucher">
              <span>Voucher Promo</span>
              <span class="font-numeric">-{{ formatNum(voucherDiscount) }}</span>
            </div>

            <div class="breakdown-divider" />
          </div>
        </div>

        <!-- Grand Total Card -->
        <div class="grand-total-card">
          <div class="total-label-row d-flex justify-content-between align-items-center">
            <span class="total-label">Total bayar</span>
            <span class="badge-tagihan">Tagihan Final</span>
          </div>
          <div class="total-amount-display font-numeric">
            <span class="currency-prefix">Rp</span>
            <span class="total-digits">{{ formatNum(totalAmount) }}</span>
          </div>
        </div>
      </aside>
    </main>

    <!-- ════════════════════════════════════════
         STATE 2: PEMBAYARAN QRIS (Muncul saat Kasir memilih QRIS)
    ════════════════════════════════════════ -->
    <main v-else-if="state === 'CART' && isQrisActive" class="state-container state-qris">
      <!-- Kolom Kiri: Ringkasan Tagihan QRIS -->
      <section class="cfd-panel qris-summary-panel d-flex flex-column justify-content-between">
        <div>
          <div class="panel-header-clean mb-4">
            <span class="badge-qris-method">METODE PEMBAYARAN: QRIS</span>
          </div>

          <div class="qris-total-box mb-4">
            <div class="text-muted mb-1" style="font-size: 13px;">Total bayar</div>
            <div class="qris-total-amount font-numeric">
              <span class="currency-prefix">Rp</span>
              <span>{{ formatNum(totalAmount) }}</span>
            </div>
          </div>

          <div class="qris-specs-list">
            <div class="qris-spec-item">
              <span class="spec-label">Metode</span>
              <span class="spec-val text-white">QRIS Dinamis</span>
            </div>
            <div class="qris-spec-item">
              <span class="spec-label">Jumlah Item</span>
              <span class="spec-val text-white">{{ totalItemCount }} Item</span>
            </div>
            <div v-if="discountAmount > 0" class="qris-spec-item">
              <span class="spec-label">Total Hemat</span>
              <span class="spec-val text-pink">-Rp {{ formatNum(discountAmount) }}</span>
            </div>
          </div>
        </div>

        <div class="qris-security-badge">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>Transaksi Terverifikasi &amp; Aman</span>
        </div>
      </section>

      <!-- Kolom Kanan: Area QR Code QRIS -->
      <section class="cfd-panel qris-code-panel d-flex flex-column align-items-center justify-content-center text-center">
        <div class="qris-instruction-title">
          Scan dengan aplikasi e-wallet atau mobile banking
        </div>

        <div class="qris-qr-wrapper">
          <QrImage :value="qrisData" :size="230" alt="QRIS Playtopia" />
        </div>

        <div class="qris-supported-wallets mt-3">
          BCA Mobile &middot; Livin' Mandiri &middot; GoPay &middot; OVO &middot; ShopeePay &middot; Dana &middot; LinkAja
        </div>

        <div class="qris-waiting-status mt-3">
          <span class="waiting-dot" />
          <span>Menunggu pembayaran...</span>
        </div>
      </section>
    </main>

    <!-- ════════════════════════════════════════
         STATE 3: PEMBAYARAN BERHASIL (Lalu Kembali Idle)
    ════════════════════════════════════════ -->
    <main v-else-if="state === 'SUCCESS'" class="state-container state-success">
      <!-- Kotak Kiri: Notifikasi Sukses & Kembalian -->
      <section class="cfd-panel success-receipt-panel d-flex flex-column justify-content-center">
        <div class="success-icon-badge mb-3">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>

        <h2 class="success-title">Pembayaran berhasil</h2>

        <div class="success-amounts-block my-3">
          <div v-if="successCashGiven" class="paid-row">
            <span class="text-muted">Dibayar:</span>
            <strong class="font-numeric ms-2">{{ rupiah(successCashGiven) }}</strong>
          </div>

          <div v-if="successCashChange !== null && successCashChange >= 0" class="change-card mt-2">
            <div class="change-label">Kembalian</div>
            <div class="change-amount font-numeric">
              {{ rupiah(successCashChange) }}
            </div>
          </div>

          <div v-else class="noncash-note mt-2">
            <span class="text-muted">Total Transaksi:</span>
            <strong class="text-white font-numeric ms-2">{{ rupiah(totalAmount) }}</strong>
          </div>
        </div>

        <div class="success-closing-note">
          Terima kasih, selamat bermain dan bergembira di Playtopia!
        </div>
      </section>

      <!-- Kotak Kanan: Branding & Sambutan Hangat -->
      <section class="cfd-panel success-welcome-panel d-flex flex-column justify-content-center align-items-center text-center">
        <div class="success-logo-box mb-3">
          <img :src="PlaytopiaLogo" alt="Playtopia" class="success-logo" />
        </div>

        <h3 class="welcome-headline">Selamat Datang &amp; Selamat Bermain!</h3>
        <p class="welcome-subtext">
          Pastikan tiket atau gelang RFID pengunjung telah aktif di Turnstile Gate masuk.
        </p>

        <div class="turnstile-gate-pill mt-3">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#00c2cb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <circle cx="12" cy="5" r="2" />
            <path d="M12 7v4" />
          </svg>
          <span>Silakan menuju Gate Masuk Wahana</span>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { rupiah } from '@/utils/format'
import QrImage from '@/components/PosLayout/QrImage.vue'
import PlaytopiaLogo from '@/assets/playtopia-logo.png'

// State
const state = ref('IDLE') // IDLE | CART | SUCCESS
const items = ref([])
const customerName = ref('')
const memberBalance = ref(null)
const memberDiscountPct = ref(null)
const subtotal = ref(0)
const totalAmount = ref(0)
const discountAmount = ref(0)
const voucherDiscount = ref(0)
const paymentMethod = ref(null)
const qrisData = ref(null)
const cashierName = ref('')

// Payment result
const successCashGiven = ref(null)
const successCashChange = ref(null)

// Timers
const currentTime = ref('')
let clock = null
let idleTimer = null
let channel = null

// Computed
const isQrisActive = computed(
  () => paymentMethod.value === 'QRIS' && !!qrisData.value
)

const totalItemCount = computed(() => {
  return items.value.reduce((acc, curr) => acc + (Number(curr.qty) || 1), 0)
})

// Catalog
const promoPackages = [
  { category: 'Playground', name: 'Paket Bermain 1 Jam', price: 50000, desc: '60 Menit' },
  { category: 'Playground', name: 'Paket Bermain 2 Jam', price: 90000, desc: '120 Menit' },
  { category: 'Playground', name: 'Paket Sepuasnya (All-Day)', price: 120000, desc: 'Bebas Re-entry' },
  { category: 'Cafe', name: 'Paket Combo Snack Anak', price: 35000, desc: 'Nugget + Es Teh' },
  { category: 'Cafe', name: 'Kopi Susu Gula Aren', price: 22000, desc: 'Dingin / Hangat' },
  { category: 'Cafe', name: 'Kentang Goreng Renyah', price: 25000, desc: 'French Fries' },
]

// Helpers
function formatNum(value) {
  const n = Number(value)
  return Number.isFinite(n)
    ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)
    : '0'
}

function tick() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
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
  voucherDiscount.value = 0
  paymentMethod.value = null
  qrisData.value = null
  successCashGiven.value = null
  successCashChange.value = null
}

function handleMessage({ data }) {
  if (!data) return

  if (data.type === 'UPDATE_CART') {
    clearTimeout(idleTimer)
    items.value = data.items || []
    customerName.value = data.customer_name || ''
    memberBalance.value = data.member_balance ?? null
    memberDiscountPct.value = data.member_discount_pct ?? null
    subtotal.value = data.subtotal ?? data.total_amount ?? 0
    totalAmount.value = data.total_amount || 0
    discountAmount.value = data.discount_amount || 0
    voucherDiscount.value = data.voucher_discount || 0
    paymentMethod.value = data.payment_method || null
    qrisData.value = data.qris_data || null
    cashierName.value = data.cashier_name || cashierName.value || 'Kasir'

    state.value = items.value.length > 0 ? 'CART' : 'IDLE'
  } else if (data.type === 'PAYMENT_SUCCESS') {
    state.value = 'SUCCESS'
    totalAmount.value = data.total_amount ?? totalAmount.value
    successCashGiven.value = data.cash_given ?? null
    successCashChange.value = data.cash_change ?? null
    cashierName.value = data.cashier_name || cashierName.value

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

  // Storage fallback
  window.addEventListener('storage', (e) => {
    if (e.key === 'playtopia_pos_display_sync' && e.newValue) {
      try {
        const payload = JSON.parse(e.newValue)
        handleMessage({ data: payload })
      } catch (err) {
        console.warn('Display sync parse error:', err)
      }
    }
  })
})

onUnmounted(() => {
  clearInterval(clock)
  clearTimeout(idleTimer)
  channel?.close()
})
</script>

<style scoped>
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* Root */
.cfd {
  height: 100vh;
  width: 100vw;
  background: #090d16;
  color: #f1f5f9;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  user-select: none;
}

.font-numeric {
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

/* Header */
.cfd-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  height: 62px;
  flex-shrink: 0;
  background: #0e1526;
  border-bottom: 1px solid #1e293b;
}

.topbar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topbar-logo-badge {
  background: #ffffff;
  padding: 4px 8px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.topbar-logo {
  height: 24px;
  object-fit: contain;
}

.topbar-brand-name {
  font-size: 14.5px;
  font-weight: 600;
  color: #f8fafc;
  line-height: 1.2;
}

.topbar-brand-sub {
  font-size: 11px;
  color: #64748b;
}

.topbar-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topbar-cashier-pill {
  font-size: 12px;
  background: #182238;
  border: 1px solid #283552;
  padding: 4px 10px;
  border-radius: 6px;
  color: #cbd5e1;
}

.topbar-cashier-pill strong {
  color: #f8fafc;
  margin-left: 4px;
}

.topbar-time-pill {
  display: flex;
  align-items: center;
  gap: 7px;
  background: #182238;
  border: 1px solid #283552;
  padding: 4px 12px;
  border-radius: 6px;
}

.time-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10b981;
}

.topbar-time {
  font-size: 14px;
  font-weight: 700;
  color: #38bdf8;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.5px;
}

/* Panels */
.state-container {
  flex: 1;
  padding: 20px 24px;
  display: grid;
  gap: 20px;
  overflow: hidden;
}

.cfd-panel {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 12px;
  padding: 18px 20px;
  overflow: hidden;
}

.panel-header-clean {
  padding-bottom: 12px;
  border-bottom: 1px solid #1e293b;
}

.panel-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #0284c7;
}

.panel-item-count {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  background: #1e293b;
  padding: 3px 9px;
  border-radius: 6px;
}

/* State: Idle */
.state-idle {
  grid-template-columns: 1fr 1.1fr;
}

.idle-hero-card {
  background: linear-gradient(145deg, #101930 0%, #0d1527 100%);
  border: 1px solid #1e293b;
  border-radius: 12px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.idle-logo {
  height: 48px;
  background: #ffffff;
  padding: 6px 12px;
  border-radius: 8px;
  margin-bottom: 24px;
}

.idle-headline {
  font-size: 38px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.5px;
  margin-bottom: 12px;
}

.idle-desc {
  font-size: 15px;
  color: #94a3b8;
  line-height: 1.6;
  max-width: 440px;
}

.idle-features {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.idle-feat-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: #182238;
  border: 1px solid #283552;
  padding: 7px 12px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 500;
  color: #cbd5e1;
}

.idle-catalog-card {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.card-title-text {
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
}

.card-tag-pill {
  font-size: 11px;
  font-weight: 600;
  color: #0284c7;
  background: rgba(2, 132, 199, 0.12);
  border: 1px solid rgba(2, 132, 199, 0.3);
  padding: 2px 8px;
  border-radius: 5px;
}

.idle-packages-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin: 16px 0;
}

.idle-package-item {
  background: #151f34;
  border: 1px solid #24314c;
  border-radius: 9px;
  padding: 12px 14px;
}

.pkg-category-badge {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 7px;
  border-radius: 4px;
}

.badge-playground {
  background: rgba(0, 194, 203, 0.15);
  color: #00c2cb;
}

.badge-cafe {
  background: rgba(255, 79, 129, 0.15);
  color: #ff4f81;
}

.pkg-name {
  font-size: 13.5px;
  font-weight: 600;
  color: #f1f5f9;
  margin: 6px 0 2px 0;
}

.pkg-price {
  font-size: 15px;
  font-weight: 700;
  color: #38bdf8;
}

.idle-footer-note {
  font-size: 12px;
  padding-top: 12px;
  border-top: 1px solid #1e293b;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

/* State: Cart */
.state-cart {
  grid-template-columns: 1fr 340px;
}

.cart-items-panel {
  display: flex;
  flex-direction: column;
}

.table-scroll-area {
  flex: 1;
  overflow-y: auto;
  margin: 8px 0;
}

.cfd-table {
  width: 100%;
  border-collapse: collapse;
}

.cfd-table th {
  font-size: 11.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #64748b;
  padding: 10px 14px;
  border-bottom: 1px solid #1e293b;
}

.cfd-table td {
  padding: 11px 14px;
  border-bottom: 1px solid #162032;
  font-size: 13.5px;
}

.item-name-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-title {
  font-weight: 600;
  color: #f8fafc;
}

.category-pill {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
}

.pill-playground {
  background: rgba(0, 194, 203, 0.12);
  color: #00c2cb;
}

.pill-cafe {
  background: rgba(255, 79, 129, 0.12);
  color: #ff4f81;
}

.item-sub-meta {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}

.qty-badge {
  background: #1e293b;
  color: #f8fafc;
  font-weight: 700;
  font-size: 12.5px;
  padding: 3px 9px;
  border-radius: 6px;
}

.cart-notice-bar {
  padding-top: 12px;
  border-top: 1px solid #1e293b;
  font-size: 12px;
}

.notice-text {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #94a3b8;
}

.payment-hint {
  color: #64748b;
}

/* Kolom Kanan Cart */
.cart-summary-panel {
  background: #0d1527;
}

.cfd-member-card {
  background: #141f36;
  border: 1px solid #223253;
  border-radius: 9px;
  padding: 12px 14px;
}

.member-label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #94a3b8;
}

.member-tag {
  font-size: 10px;
  font-weight: 700;
  color: #10b981;
  background: rgba(16, 185, 129, 0.15);
  padding: 1px 6px;
  border-radius: 4px;
}

.member-name {
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
}

.member-balance {
  font-size: 12px;
  color: #cbd5e1;
}

.member-balance strong {
  color: #f59e0b;
}

.summary-breakdown {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.breakdown-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13.5px;
  color: #cbd5e1;
}

.breakdown-row.discount {
  color: #ff4f81;
  font-weight: 600;
}

.breakdown-row.voucher {
  color: #f59e0b;
  font-weight: 600;
}

.breakdown-divider {
  height: 1px;
  background: #1e293b;
  margin: 6px 0;
}

.grand-total-card {
  background: #131c33;
  border: 1px solid #233252;
  border-radius: 10px;
  padding: 16px;
}

.total-label {
  font-size: 12.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #94a3b8;
}

.badge-tagihan {
  font-size: 10.5px;
  font-weight: 700;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.12);
  padding: 2px 7px;
  border-radius: 4px;
}

.total-amount-display {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-top: 6px;
}

.currency-prefix {
  font-size: 20px;
  font-weight: 700;
  color: #38bdf8;
}

.total-digits {
  font-size: 38px;
  font-weight: 800;
  color: #ffffff;
  line-height: 1;
}

/* State: QRIS */
.state-qris {
  grid-template-columns: 380px 1fr;
}

.badge-qris-method {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.3);
  padding: 4px 10px;
  border-radius: 6px;
}

.qris-total-amount {
  font-size: 40px;
  font-weight: 800;
  color: #ffffff;
  line-height: 1;
}

.qris-specs-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 0;
  border-top: 1px solid #1e293b;
  border-bottom: 1px solid #1e293b;
}

.qris-spec-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13.5px;
}

.spec-label {
  color: #94a3b8;
}

.text-pink {
  color: #ff4f81;
  font-weight: 600;
}

.qris-security-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  padding: 8px 12px;
  border-radius: 7px;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.qris-instruction-title {
  font-size: 17px;
  font-weight: 600;
  color: #f8fafc;
  margin-bottom: 20px;
}

.qris-qr-wrapper {
  background: #ffffff;
  padding: 16px;
  border-radius: 14px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.qris-supported-wallets {
  font-size: 12px;
  color: #64748b;
  max-width: 420px;
}

.qris-waiting-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #38bdf8;
  background: #141f36;
  border: 1px solid #223253;
  padding: 6px 16px;
  border-radius: 20px;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}

.waiting-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #38bdf8;
  animation: pulse-dot 1.2s infinite ease-in-out;
}

/* State: Success */
.state-success {
  grid-template-columns: 1fr 1fr;
}

.success-receipt-panel {
  background: linear-gradient(145deg, #0f1c2d 0%, #0d1527 100%);
  border: 1px solid #1a324a;
  padding: 40px;
}

.success-icon-badge {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-title {
  font-size: 28px;
  font-weight: 800;
  color: #ffffff;
}

.paid-row {
  font-size: 16px;
  color: #cbd5e1;
}

.paid-row strong {
  color: #ffffff;
}

.change-card {
  background: #14233a;
  border: 1px solid #1f3a5e;
  border-radius: 10px;
  padding: 16px 20px;
}

.change-label {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #f59e0b;
}

.change-amount {
  font-size: 38px;
  font-weight: 800;
  color: #fbbf24;
  line-height: 1.1;
  margin-top: 4px;
}

.noncash-note {
  font-size: 16px;
  color: #94a3b8;
}

.success-closing-note {
  font-size: 13.5px;
  color: #94a3b8;
}

.success-welcome-panel {
  background: #0f172a;
  padding: 40px;
}

.success-logo-box {
  background: #ffffff;
  padding: 10px 16px;
  border-radius: 9px;
  display: inline-flex;
}

.success-logo {
  height: 42px;
  object-fit: contain;
}

.welcome-headline {
  font-size: 22px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 8px;
}

.welcome-subtext {
  font-size: 13.5px;
  color: #94a3b8;
  max-width: 360px;
  line-height: 1.5;
}

.turnstile-gate-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #00c2cb;
  background: rgba(0, 194, 203, 0.12);
  border: 1px solid rgba(0, 194, 203, 0.25);
  padding: 8px 16px;
  border-radius: 20px;
}
</style>
