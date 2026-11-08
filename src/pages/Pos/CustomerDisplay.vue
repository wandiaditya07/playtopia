<template>
  <div class="cfd">
    <header class="cfd-header d-flex justify-content-between align-items-center">
      <div class="d-flex align-items-center gap-3">
        <img :src="PlaytopiaLogo" alt="Playtopia" class="bg-white p-2 rounded-3 shadow-sm" style="max-height: 48px;" />
        <div>
          <div class="cfd-brand text-info fw-bold" style="letter-spacing: 1px;">
            PLAYTOPIA PLAYGROUND &amp; CAFE
          </div>
          <h4 class="m-0 text-white fw-bold">
            Selamat Datang!
          </h4>
        </div>
      </div>
      <div class="text-end">
        <div class="cfd-time fs-4 fw-bold text-warning">
          {{ currentTime }}
        </div>
        <div class="small text-secondary">
          {{ currentDate }}
        </div>
      </div>
    </header>

    <main class="cfd-body">
      <!-- IDLE -->
      <section
        v-if="state === 'IDLE'"
        class="cfd-center text-center"
      >
        <div>
          <h1 class="display-4 fw-bold text-info mb-3">
            Selamat Datang!
          </h1>
          <p class="lead text-secondary">
            Bermain seru, aman, dan nyaman bersama keluarga.
          </p>
          <div class="mt-4 d-flex flex-wrap justify-content-center gap-2">
            <span class="badge bg-info text-dark fs-6 p-3">Toleransi waktu 10 menit</span>
            <span class="badge bg-success fs-6 p-3">Re-entry maksimal 2x</span>
            <span class="badge bg-warning text-dark fs-6 p-3">QRIS, Debit &amp; Member</span>
          </div>
        </div>
      </section>

      <!-- CART -->
      <section
        v-else-if="state === 'CART'"
        class="row g-0 flex-grow-1"
      >
        <div class="col-7 p-4 d-flex flex-column border-end border-secondary">
          <h4 class="text-warning fw-bold mb-3">
            Rincian Pesanan ({{ items.length }} item)
          </h4>
          <div class="flex-grow-1 overflow-auto">
            <table class="table table-dark table-striped align-middle mb-0">
              <thead>
                <tr>
                  <th>Item</th>
                  <th class="text-center">
                    Qty
                  </th>
                  <th class="text-end">
                    Harga
                  </th>
                  <th class="text-end">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, idx) in items"
                  :key="idx"
                >
                  <td class="fw-bold">
                    {{ item.name }}
                    <span
                      v-if="item.category === 'PLAYGROUND' && item.duration_minutes"
                      class="badge bg-primary ms-1"
                    >{{ item.duration_minutes }} mnt</span>
                  </td>
                  <td class="text-center fw-bold">
                    {{ item.qty }}
                  </td>
                  <td class="text-end">
                    {{ rupiah(item.price) }}
                  </td>
                  <td class="text-end text-success fw-bold">
                    {{ rupiah(item.price * item.qty) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="col-5 p-4 d-flex flex-column justify-content-between cfd-side">
          <div>
            <div
              v-if="customerName"
              class="p-3 mb-3 rounded bg-secondary"
            >
              <small class="text-uppercase text-light">Member</small>
              <h5 class="m-0 fw-bold">
                {{ customerName }}
              </h5>
            </div>

            <div class="p-4 rounded text-center mb-4 cfd-total">
              <div class="text-secondary text-uppercase">
                Total Tagihan
              </div>
              <div class="display-4 fw-bold text-warning my-2">
                {{ rupiah(totalAmount) }}
              </div>
              <div
                v-if="discountAmount > 0"
                class="text-success fw-bold"
              >
                Hemat diskon member {{ rupiah(discountAmount) }}
              </div>
            </div>

            <div
              v-if="paymentMethod === 'QRIS' && qrisData"
              class="p-3 bg-white rounded text-dark text-center"
            >
              <span class="badge bg-danger mb-2">SCAN QRIS UNTUK MEMBAYAR</span>
              <div class="my-2">
                <QrImage
                  :value="qrisData"
                  :size="200"
                  alt="QRIS"
                />
              </div>
              <small class="text-muted d-block">Mode uji coba - bukan QRIS sungguhan</small>
            </div>
            <div
              v-else-if="paymentMethod"
              class="p-3 rounded bg-secondary text-center"
            >
              <small class="text-light">Metode pembayaran</small>
              <h4 class="m-0 fw-bold">
                {{ methodLabel }}
              </h4>
            </div>
          </div>
          <div class="text-center text-secondary small">
            Silakan periksa kembali pesanan Anda.
          </div>
        </div>
      </section>

      <!-- SUCCESS -->
      <section
        v-else
        class="cfd-center text-center cfd-success"
      >
        <div class="p-5 rounded cfd-card">
          <h1 class="display-4 fw-bold text-success mb-3">
            Pembayaran Berhasil!
          </h1>
          <h3 class="text-light mb-4">
            Terima kasih telah berkunjung
          </h3>
          <div class="p-3 bg-secondary rounded d-inline-block text-start mb-4">
            <div>No. Transaksi: <strong>{{ lastInvoice }}</strong></div>
            <div>Total dibayar: <strong class="text-warning">{{ rupiah(totalAmount) }}</strong></div>
          </div>
          <p class="lead text-info mb-0">
            Silakan gunakan tiket QR Anda di gate turnstile.
          </p>
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

const METHOD_LABELS = { CASH: 'Tunai', QRIS: 'QRIS', DEBIT: 'Kartu Debit', MEMBER_BALANCE: 'Saldo Member' }

const state = ref('IDLE') // IDLE | CART | SUCCESS
const items = ref([])
const customerName = ref('')
const totalAmount = ref(0)
const discountAmount = ref(0)
const paymentMethod = ref(null)
const qrisData = ref(null)
const lastInvoice = ref('')

const currentTime = ref('')
const currentDate = ref('')
const methodLabel = computed(() => METHOD_LABELS[paymentMethod.value] || paymentMethod.value)

let clock = null
let idleTimer = null
let channel = null

function tick() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  currentDate.value = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function goIdle() {
  state.value = 'IDLE'
  items.value = []
  paymentMethod.value = null
  qrisData.value = null
}

function handleMessage({ data }) {
  if (data.type === 'UPDATE_CART') {
    clearTimeout(idleTimer)
    items.value = data.items || []
    customerName.value = data.customer_name || ''
    totalAmount.value = data.total_amount || 0
    discountAmount.value = data.discount_amount || 0
    paymentMethod.value = data.payment_method || null
    qrisData.value = data.qris_data || null
    state.value = items.value.length ? 'CART' : 'IDLE'
  } else if (data.type === 'PAYMENT_SUCCESS') {
    state.value = 'SUCCESS'
    lastInvoice.value = data.invoice_number || ''
    totalAmount.value = data.total_amount ?? totalAmount.value
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
.cfd {
  height: 100vh;
  width: 100vw;
  background: #0f172a;
  color: #f8fafc;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.cfd-header {
  min-height: 90px;
  background: linear-gradient(135deg, #1e293b, #0f172a);
  border-bottom: 2px solid #334155;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
}
.cfd-brand {
  font-size: 0.8rem;
  letter-spacing: 2px;
  color: #38bdf8;
  font-weight: 700;
}
.cfd-time {
  font-size: 1.8rem;
  font-weight: 800;
  color: #38bdf8;
  font-variant-numeric: tabular-nums;
}
.cfd-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.cfd-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}
.cfd-side {
  background: #1e293b;
}
.cfd-total {
  background: #0f172a;
  border: 2px solid #f59e0b;
}
.cfd-success {
  background: radial-gradient(circle at center, #064e3b 0%, #0f172a 100%);
}
.cfd-card {
  background: #1e293b;
  border: 2px solid #10b981;
  max-width: 700px;
}
</style>
