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
          class="btn btn-sm fw-semibold"
          :class="waiverShownOnDisplay ? 'btn-info text-white' : 'btn-outline-info'"
          @click="toggleWaiverOnCustomerDisplay"
        >
          {{ waiverShownOnDisplay ? 'Tutup QR Waiver di Layar Pelanggan' : 'Tampilkan QR Waiver di Layar Pelanggan' }}
        </button>
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
            <!-- Tarik Data Waiver Online (Poin 15, 16, 17) -->
            <div class="mb-3 p-2 rounded border" style="background-color: #f0f9ff; border-color: #bae6fd !important;">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <label class="form-label small fw-bold text-dark m-0" for="waiver-input">
                  Tarik Data Waiver Online (QR / No. HP)
                </label>
                <a href="/waiver" target="_blank" rel="noopener" class="small text-decoration-none fw-semibold" style="font-size: 11px;">
                  Buka Form ↗
                </a>
              </div>
              <div class="input-group input-group-sm">
                <input
                  id="waiver-input"
                  v-model.trim="waiverQuery"
                  type="text"
                  class="form-control"
                  placeholder="Scan QR Waiver / Ketik No. HP / Nama"
                  :disabled="waiverBusy || submitting"
                  @keyup.enter="lookupWaiver"
                >
                <button
                  v-if="!selectedWaiver"
                  type="button"
                  class="btn btn-primary fw-semibold"
                  :disabled="!waiverQuery || waiverBusy || submitting"
                  @click="lookupWaiver"
                >
                  {{ waiverBusy ? '...' : 'Tarik' }}
                </button>
                <button
                  v-else
                  type="button"
                  class="btn btn-outline-danger"
                  :disabled="submitting"
                  @click="clearWaiver"
                >
                  Reset
                </button>
              </div>
              <div v-if="waiverError" class="small text-danger mt-1" style="font-size: 11.5px;">
                {{ waiverError }}
              </div>

              <!-- Daftar Hasil Pencarian jika lebih dari 1 -->
              <div v-if="waiverResults.length > 1 && !selectedWaiver" class="mt-2 bg-white rounded border p-1" style="max-height: 130px; overflow-y: auto;">
                <button
                  v-for="w in waiverResults"
                  :key="w.id"
                  type="button"
                  class="btn btn-sm btn-light w-100 text-start mb-1 d-flex justify-content-between align-items-center"
                  style="font-size: 11.5px;"
                  @click="selectWaiverRecord(w)"
                >
                  <span><strong>{{ w.parent_name }}</strong> ({{ w.phone }})</span>
                  <span class="badge bg-info-subtle text-info">{{ w.children.length }} Anak</span>
                </button>
              </div>

              <!-- Detail Waiver Terpilih + Klik Nama Anak -->
              <div v-if="selectedWaiver" class="mt-2 bg-white rounded border p-2 small">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <div>
                    <strong class="text-dark">{{ selectedWaiver.parent_name }}</strong>
                    <span class="text-muted ms-1">({{ selectedWaiver.phone }})</span>
                  </div>
                  <span class="badge bg-primary-subtle text-primary font-monospace" style="font-size: 10px;">
                    {{ selectedWaiver.registration_code }}
                  </span>
                </div>
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <span class="text-muted" style="font-size: 11px;">Klik nama anak untuk pilih / batal pilih:</span>
                  <router-link
                    :to="selectedWaiver.member_data ? '/app/members' : '/app/registrations'"
                    class="text-decoration-none fw-semibold"
                    style="font-size: 10.5px;"
                  >
                    Kelola Anak ↗
                  </router-link>
                </div>
                <div v-if="selectedWaiver.children && selectedWaiver.children.length > 0" class="d-flex flex-wrap gap-1">
                  <button
                    v-for="(ch, cIdx) in selectedWaiver.children"
                    :key="cIdx"
                    type="button"
                    class="btn btn-xs py-0 px-2 fw-semibold"
                    :class="isChildAssignedInCart(ch.name) ? 'btn-success text-white' : 'btn-outline-primary'"
                    style="font-size: 11.5px; border-radius: 99px;"
                    @click="toggleWaiverChildInCart(ch.name)"
                  >
                    {{ isChildAssignedInCart(ch.name) ? '✓ ' : '+ ' }}{{ ch.name }} ({{ ch.age }} thn)
                  </button>
                </div>
                <div v-else class="text-muted fst-italic" style="font-size: 11.5px;">
                  Belum ada data anak terdaftar. Silakan tambahkan melalui menu
                  <router-link to="/app/members" class="fw-semibold text-decoration-none">Direktori Member ↗</router-link>
                </div>
              </div>
            </div>

            <!-- Member (Poin 4: Kartu Member Sistem Swipe, Diskon 20% Tiket & 10% Cafe, Expired 3 Bulan) -->
            <label
              class="form-label small text-muted mb-1"
              for="member-input"
            >Member (Swipe Kartu Member / Nama / Kode / No. HP)</label>
            <div class="input-group input-group-sm mb-1">
              <input
                id="member-input"
                v-model.trim="memberQuery"
                type="text"
                class="form-control"
                placeholder="Swipe Kartu Member, Nama, Kode (MBR-001), atau No. HP"
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
              <div class="d-flex justify-content-between align-items-center">
                <strong>{{ member.name }}</strong>
                <span class="badge bg-white text-success font-monospace" style="font-size: 10.5px;">
                  {{ member.member_code || 'MEMBER SWIPE' }}
                </span>
              </div>
              <div>
                Saldo <strong>{{ rupiah(member.balance) }}</strong> &middot; Diskon <strong>Tiket 20%</strong> &amp; <strong>Cafe 10%</strong>
              </div>
              <div v-if="member.expires_on" class="text-dark mt-1" style="font-size: 11px;">
                💳 Sistem Swipe &middot; Berlaku (3 Bln) s/d: <strong>{{ fmtShortDate(member.expires_on) }}</strong>
              </div>
            </div>

            <!-- Voucher Potongan Diskon (Poin 3 - Terpisah dari Member) -->
            <div class="mb-3 p-2 rounded border" style="background-color: #fffbeb; border-color: #fde68a !important;">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <label class="form-label small fw-bold text-dark m-0" for="voucher-input">
                  Voucher Potongan Diskon
                </label>
                <router-link to="/app/vouchers" class="small text-decoration-none fw-semibold" style="font-size: 11px; color: #b45309;">
                  Kelola Voucher ↗
                </router-link>
              </div>
              <div class="input-group input-group-sm">
                <input
                  id="voucher-input"
                  v-model.trim="voucherQuery"
                  type="text"
                  class="form-control font-monospace text-uppercase"
                  placeholder="Ketik / Scan Kode Voucher..."
                  :disabled="voucherBusy || !!appliedVoucher || submitting"
                  @keyup.enter="lookupVoucher"
                >
                <button
                  v-if="!appliedVoucher"
                  type="button"
                  class="btn btn-warning fw-semibold text-dark"
                  :disabled="!voucherQuery || voucherBusy || submitting"
                  @click="lookupVoucher"
                >
                  {{ voucherBusy ? '...' : 'Pakai' }}
                </button>
                <button
                  v-else
                  type="button"
                  class="btn btn-outline-danger"
                  :disabled="submitting"
                  @click="clearVoucher"
                >
                  Lepas
                </button>
              </div>

              <div v-if="voucherError" class="small text-danger mt-1" style="font-size: 11.5px;">
                {{ voucherError }}
              </div>

              <!-- Pilihan Cepat Voucher Aktif -->
              <div v-if="!appliedVoucher && availableVouchers.length > 0" class="mt-2">
                <div class="text-muted mb-1" style="font-size: 10.5px;">Pilih cepat voucher aktif:</div>
                <div class="d-flex flex-wrap gap-1">
                  <button
                    v-for="v in availableVouchers.slice(0, 4)"
                    :key="v.id"
                    type="button"
                    class="btn btn-xs btn-outline-dark py-0 px-2 font-monospace"
                    style="font-size: 11px; border-radius: 99px;"
                    :disabled="submitting"
                    @click="selectVoucherObj(v)"
                  >
                    🏷️ {{ v.code }} ({{ (v.discount_type === 'percent' || v.discount_type === 'percentage') ? `${v.discount_value}%` : rupiah(v.discount_value) }})
                  </button>
                </div>
              </div>

              <!-- Info Voucher Terpasang -->
              <div v-if="appliedVoucher" class="mt-2 bg-white rounded border p-2 small">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <strong class="font-monospace text-dark">{{ appliedVoucher.code }}</strong>
                    <span class="text-muted ms-1">&middot; {{ appliedVoucher.name }}</span>
                  </div>
                  <span class="badge bg-warning text-dark">
                    {{ (appliedVoucher.discount_type === 'percent' || appliedVoucher.discount_type === 'percentage') ? `Diskon ${appliedVoucher.discount_value}%` : `Potongan ${rupiah(appliedVoucher.discount_value)}` }}
                  </span>
                </div>
                <div
                  v-if="Number(appliedVoucher.min_purchase) > 0 && cartSubtotal < Number(appliedVoucher.min_purchase)"
                  class="text-danger fw-semibold mt-1"
                  style="font-size: 11px;"
                >
                  ⚠️ Min. belanja {{ rupiah(appliedVoucher.min_purchase) }} agar potongan voucher aktif.
                </div>
                <div
                  v-else-if="voucherDiscountAmount > 0"
                  class="text-success fw-semibold mt-1"
                  style="font-size: 11px;"
                >
                  ✓ Potongan voucher {{ rupiah(voucherDiscountAmount) }} aktif{{ member ? ' (Digabung dengan Diskon Member!)' : '!' }}
                </div>
              </div>
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
                v-if="memberPlaygroundDiscount > 0"
                class="d-flex justify-content-between text-success"
              >
                <span>Diskon Member Tiket (20%)</span>
                <span>- {{ rupiah(memberPlaygroundDiscount) }}</span>
              </div>
              <div
                v-if="memberCafeDiscount > 0"
                class="d-flex justify-content-between text-success"
              >
                <span>Diskon Member Cafe (10%)</span>
                <span>- {{ rupiah(memberCafeDiscount) }}</span>
              </div>
              <div
                v-if="voucherDiscountAmount > 0"
                class="d-flex justify-content-between text-success"
              >
                <span>Diskon Voucher ({{ appliedVoucher?.code }})</span>
                <span>- {{ rupiah(voucherDiscountAmount) }}</span>
              </div>
              <div
                v-if="memberDiscountAmount > 0 && voucherDiscountAmount > 0"
                class="d-flex justify-content-between small fw-bold text-primary pt-1"
                style="font-size: 11.5px;"
              >
                <span>Total Gabungan Diskon (Member + Voucher)</span>
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
              v-if="receipt.member_playground_discount > 0"
              class="d-flex justify-content-between py-1 text-success"
            >
              <span>Diskon Member Tiket (20%)</span>
              <span>- {{ rupiah(receipt.member_playground_discount) }}</span>
            </div>
            <div
              v-if="receipt.member_cafe_discount > 0"
              class="d-flex justify-content-between py-1 text-success"
            >
              <span>Diskon Member Cafe (10%)</span>
              <span>- {{ rupiah(receipt.member_cafe_discount) }}</span>
            </div>
            <div
              v-if="!receipt.member_playground_discount && !receipt.member_cafe_discount && (receipt.member_discount > 0 || (!receipt.voucher_discount && receipt.discount > 0))"
              class="d-flex justify-content-between py-1 text-success"
            >
              <span>Diskon Member</span>
              <span>- {{ rupiah(receipt.member_discount || receipt.discount) }}</span>
            </div>
            <div
              v-if="receipt.voucher_discount > 0"
              class="d-flex justify-content-between py-1 text-success"
            >
              <span>Diskon Voucher {{ receipt.voucher_code ? `(${receipt.voucher_code})` : '' }}</span>
              <span>- {{ rupiah(receipt.voucher_discount) }}</span>
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

// Voucher Potongan Diskon state (Poin 3)
const voucherQuery = ref('')
const appliedVoucher = ref(null)
const availableVouchers = ref([])
const voucherBusy = ref(false)
const voucherError = ref('')

// Waiver Online state
const waiverQuery = ref('')
const selectedWaiver = ref(null)
const waiverResults = ref([])
const waiverBusy = ref(false)
const waiverError = ref('')
const waiverShownOnDisplay = ref(false)
const waiverPublicUrl = computed(() => `${window.location.origin}/waiver`)

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
const playgroundSubtotal = computed(() =>
  cart.value.filter(i => i.category === 'PLAYGROUND').reduce((s, i) => s + i.price * i.qty, 0)
)
const cafeSubtotal = computed(() =>
  cart.value.filter(i => i.category === 'CAFE').reduce((s, i) => s + i.price * i.qty, 0)
)
// Poin 4: Diskon Member 20% untuk Tiket Masuk Playground & 10% untuk Menu Cafe
const memberPlaygroundDiscount = computed(() =>
  member.value ? Math.round((playgroundSubtotal.value * 20) / 100) : 0
)
const memberCafeDiscount = computed(() =>
  member.value ? Math.round((cafeSubtotal.value * 10) / 100) : 0
)
const memberDiscountAmount = computed(() => memberPlaygroundDiscount.value + memberCafeDiscount.value)

function fmtShortDate(val) {
  if (!val) return '-'
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return String(val).slice(0, 10)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
const voucherDiscountAmount = computed(() => {
  if (!appliedVoucher.value || cartSubtotal.value <= 0) return 0
  const minPurchase = Number(appliedVoucher.value.min_purchase) || 0
  if (cartSubtotal.value < minPurchase) return 0
  const dType = String(appliedVoucher.value.discount_type || '').toLowerCase()
  const dVal = Number(appliedVoucher.value.discount_value) || 0
  let raw = 0
  if (dType === 'percent' || dType === 'percentage') {
    raw = Math.round((cartSubtotal.value * dVal) / 100)
    const maxD = Number(appliedVoucher.value.max_discount) || 0
    if (maxD > 0) raw = Math.min(raw, Math.round(maxD))
  } else {
    raw = Math.round(dVal)
  }
  const remainingAfterMember = Math.max(0, cartSubtotal.value - memberDiscountAmount.value)
  return Math.min(raw, remainingAfterMember)
})
const discountAmount = computed(() => memberDiscountAmount.value + voucherDiscountAmount.value)
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
    const [p, s, vRes] = await Promise.all([
      api('/products'),
      api('/shifts/current'),
      api('/members/vouchers/active').catch(() => ({ success: false, data: [] }))
    ])
    products.value = p.data
    shift.value = s.data
    if (vRes?.success && Array.isArray(vRes.data)) {
      availableVouchers.value = vRes.data
    }
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
    autoAssignWaiverChildrenToCart()
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
  autoAssignWaiverChildrenToCart()
}

function autoAssignWaiverChildrenToCart() {
  if (!selectedWaiver.value || !Array.isArray(selectedWaiver.value.children)) return
  const childNames = selectedWaiver.value.children.map(c => c.name).filter(Boolean)
  if (childNames.length === 0) return

  const pgItems = cart.value.filter(i => i.category === 'PLAYGROUND')
  let nameIdx = 0
  for (const item of pgItems) {
    if (!item.visitor_name.trim()) {
      const slice = childNames.slice(nameIdx, nameIdx + item.qty)
      if (slice.length > 0) {
        item.visitor_name = slice.join(', ')
        nameIdx += slice.length
      }
    }
  }
}

function isChildAssignedInCart(childName) {
  const target = String(childName || '').trim().toLowerCase()
  return cart.value.some(i =>
    i.category === 'PLAYGROUND' &&
    i.visitor_name.split(',').map(s => s.trim().toLowerCase()).includes(target)
  )
}

function toggleWaiverChildInCart(childName) {
  const name = String(childName || '').trim()
  if (!name || !canEditCart.value) return
  const targetLower = name.toLowerCase()

  // Cek apakah anak ini sudah masuk ke salah satu item tiket Playground di keranjang
  const assignedItem = cart.value.find(i =>
    i.category === 'PLAYGROUND' &&
    i.visitor_name.split(',').map(s => s.trim().toLowerCase()).includes(targetLower)
  )

  // Jika sudah terpilih -> klik lagi akan melepas (uncheck) & mengurangi qty tiket
  if (assignedItem) {
    const remainingNames = assignedItem.visitor_name
      .split(',')
      .map(s => s.trim())
      .filter(s => s && s.toLowerCase() !== targetLower)

    if (remainingNames.length === 0) {
      // Opsi B: Jika anak terakhir dilepas, hapus item tiket dari keranjang (qty -> 0)
      cart.value = cart.value.filter(i => i !== assignedItem)
    } else {
      assignedItem.visitor_name = remainingNames.join(', ')
      assignedItem.qty = Math.max(remainingNames.length, assignedItem.qty - 1)
    }
    return
  }

  // Jika belum terpilih -> masukkan ke tiket Playground di keranjang
  let pgItem = cart.value.find(i => i.category === 'PLAYGROUND' && !i.visitor_name.trim())
  if (!pgItem) {
    pgItem = cart.value.find(i => i.category === 'PLAYGROUND')
  }

  // Jika belum ada tiket playground di keranjang, tambahkan paket bermain pertama secara otomatis
  if (!pgItem) {
    const firstPgProduct = products.value.find(p => p.category === 'PLAYGROUND')
    if (firstPgProduct) {
      cart.value.push({
        product_id: firstPgProduct.id,
        name: firstPgProduct.name,
        category: firstPgProduct.category,
        price: firstPgProduct.price,
        duration_minutes: firstPgProduct.duration_minutes,
        qty: 1,
        visitor_name: name
      })
    }
    return
  }

  const currentNames = pgItem.visitor_name
    ? pgItem.visitor_name.split(',').map(s => s.trim()).filter(Boolean)
    : []

  if (currentNames.length === 0) {
    pgItem.visitor_name = name
  } else {
    currentNames.push(name)
    pgItem.visitor_name = currentNames.join(', ')
    if (pgItem.qty < currentNames.length) {
      pgItem.qty = currentNames.length
    }
  }
}

async function lookupWaiver() {
  if (!waiverQuery.value || waiverBusy.value) return
  waiverBusy.value = true
  waiverError.value = ''
  waiverResults.value = []
  try {
    const res = await api(`/waivers/search?q=${encodeURIComponent(waiverQuery.value)}`)
    const list = Array.isArray(res.data) ? res.data : []
    if (list.length === 0) {
      waiverError.value = 'Data Waiver tidak ditemukan. Pastikan pengunjung sudah isi form /waiver.'
    } else if (list.length === 1) {
      selectWaiverRecord(list[0])
    } else {
      waiverResults.value = list
    }
  } catch (err) {
    waiverError.value = err.message || 'Gagal mencari data waiver.'
  } finally {
    waiverBusy.value = false
  }
}

function selectWaiverRecord(w) {
  selectedWaiver.value = w
  waiverResults.value = []
  waiverError.value = ''
  if (w?.member_data && !member.value) {
    member.value = w.member_data
  }
  autoAssignWaiverChildrenToCart()
}

function clearWaiver() {
  selectedWaiver.value = null
  waiverResults.value = []
  waiverQuery.value = ''
  waiverError.value = ''
}

function changeQty(item, delta) {
  const nextQty = Math.min(99, Math.max(1, item.qty + delta))
  item.qty = nextQty
  if (delta < 0 && item.category === 'PLAYGROUND' && item.visitor_name) {
    const names = item.visitor_name.split(',').map(s => s.trim()).filter(Boolean)
    if (names.length > nextQty) {
      item.visitor_name = names.slice(0, nextQty).join(', ')
    }
  }
}

function removeFromCart(item) {
  cart.value = cart.value.filter(i => i !== item)
}

function clearCart() {
  cart.value = []
  clearMember()
  clearVoucher()
  clearWaiver()
}

// Voucher Potongan Diskon (Poin 3)
async function lookupVoucher() {
  if (!voucherQuery.value || voucherBusy.value) return
  voucherBusy.value = true
  voucherError.value = ''
  try {
    const res = await api(`/members/vouchers/lookup/${encodeURIComponent(voucherQuery.value.trim())}`)
    if (res.success && res.data) {
      selectVoucherObj(res.data)
    }
  } catch (err) {
    voucherError.value = err.message || 'Kode voucher tidak valid.'
  } finally {
    voucherBusy.value = false
  }
}

function selectVoucherObj(v) {
  appliedVoucher.value = v
  voucherQuery.value = v.code
  voucherError.value = ''
}

function clearVoucher() {
  appliedVoucher.value = null
  voucherQuery.value = ''
  voucherError.value = ''
}

// Member
async function lookupMember() {
  if (!memberQuery.value || lookupBusy.value) return
  lookupBusy.value = true
  lookupError.value = ''
  try {
    const res = await api(`/members/lookup/${encodeURIComponent(memberQuery.value)}`)
    member.value = res.data
    if (member.value && !selectedWaiver.value) {
      selectedWaiver.value = {
        id: `mbr-${member.value.id}`,
        member_id: member.value.id,
        registration_code: member.value.waiver_code || member.value.member_code,
        parent_name: member.value.name,
        phone: member.value.phone,
        children: Array.isArray(member.value.children) ? member.value.children : [],
        member_data: member.value
      }
      autoAssignWaiverChildrenToCart()
    }
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
        customer_name: selectedWaiver.value?.parent_name || cart.value.find(i => i.category === 'PLAYGROUND')?.visitor_name.trim() || 'Pengunjung Umum',
        payment_method: paymentMethod.value,
        member_id: member.value?.id ?? null,
        voucher_id: (appliedVoucher.value && voucherDiscountAmount.value > 0) ? appliedVoucher.value.id : null,
        voucher_code: (appliedVoucher.value && voucherDiscountAmount.value > 0) ? appliedVoucher.value.code : null,
        cash_given: paymentMethod.value === 'CASH' ? Number(cashGiven.value) : undefined,
        items: cart.value.map(i => ({
          product_id: i.product_id,
          qty: i.qty,
          visitor_names: i.category === 'PLAYGROUND'
            ? i.visitor_name.split(',').map(s => s.trim()).filter(Boolean)
            : []
        }))
      }
    })

    receipt.value = res.data
    showPayment.value = false
    waiverShownOnDisplay.value = false
    sendDisplayMessage({
      type: 'PAYMENT_SUCCESS',
      invoice_number: res.data.invoice_number,
      total_amount: res.data.total_amount,
      cash_given: paymentMethod.value === 'CASH' ? (Number(cashGiven.value) || 0) : null,
      cash_change: paymentMethod.value === 'CASH' ? Math.max(0, cashChange.value) : null,
      payment_method: paymentMethod.value,
      cashier_name: auth.user?.name || 'Kasir'
    })

    cart.value = []
    clearMember()
    clearVoucher()
    clearWaiver()
    loadVisitors()
    api('/members/vouchers/active').then(vRes => {
      if (vRes?.success && Array.isArray(vRes.data)) availableVouchers.value = vRes.data
    }).catch(() => {})
    // Sync shift
    api('/shifts/current').then(s => { shift.value = s.data }).catch(() => {})
  } catch (err) {
    submitError.value = err.message
  } finally {
    submitting.value = false
  }
}

// Customer display
function sendDisplayMessage(payload) {
  const msg = { ...payload, _ts: Date.now() }
  channel?.postMessage(msg)
  try {
    localStorage.setItem('playtopia_pos_display_sync', JSON.stringify(msg))
  } catch {
    // ignore storage quota errors
  }
}

function broadcastCart() {
  if (cart.value.length > 0) {
    waiverShownOnDisplay.value = false
  }
  sendDisplayMessage({
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

function toggleWaiverOnCustomerDisplay() {
  waiverShownOnDisplay.value = !waiverShownOnDisplay.value
  if (waiverShownOnDisplay.value) {
    sendDisplayMessage({
      type: 'SHOW_WAIVER_QR',
      active: true,
      waiver_url: waiverPublicUrl.value,
      cashier_name: auth.user?.name || 'Kasir'
    })
  } else {
    broadcastCart()
  }
}

function openCustomerDisplay() {
  window.open('/customer-display', 'CustomerFacingDisplay', 'width=1024,height=768')
  setTimeout(() => {
    if (waiverShownOnDisplay.value) {
      sendDisplayMessage({
        type: 'SHOW_WAIVER_QR',
        active: true,
        waiver_url: waiverPublicUrl.value,
        cashier_name: auth.user?.name || 'Kasir'
      })
    } else {
      broadcastCart()
    }
  }, 800)
}

function printReceipt() {
  window.print()
}

watch([cart, member, appliedVoucher, paymentMethod, showPayment], broadcastCart, { deep: true })

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
