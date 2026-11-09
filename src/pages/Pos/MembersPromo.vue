<template>
  <div class="pt-members-page">
    <!-- Top Page Bar -->
    <div class="pt-page-bar d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
      <div>
        <h5 class="mb-0 fw-semibold text-dark">{{ pageTitle }}</h5>
        <div class="text-muted" style="font-size: 12.5px;">{{ pageSubtitle }}</div>
      </div>

      <div class="d-flex flex-wrap align-items-center gap-2">
        <!-- Button: Registrasi Member (Tab Members) -->
        <button
          v-if="activeTab === 'members'"
          type="button"
          class="pt-btn-primary"
          @click="showMemberModal = true"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Registrasi Member</span>
        </button>

        <!-- Button: Terbitkan Kartu RFID (Tab Cards) -->
        <button
          v-if="activeTab === 'cards'"
          type="button"
          class="pt-btn-primary"
          @click="openIssueCardModal"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
          <span>Hubungkan Kartu RFID</span>
        </button>

        <!-- Button: Tambah Paket Membership (Tab Plans) -->
        <button
          v-if="activeTab === 'plans'"
          type="button"
          class="pt-btn-primary"
          @click="openCreatePlanModal"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Tambah Paket Membership</span>
        </button>

        <!-- Button: Tambah Voucher (Tab Vouchers) -->
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

        <!-- Button: Refresh -->
        <button
          type="button"
          class="pt-btn-outline"
          :disabled="loading"
          @click="loadData"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span>{{ loading ? 'Memuat...' : 'Refresh' }}</span>
        </button>
      </div>
    </div>

    <!-- Alert Feedback -->
    <div
      v-if="feedback"
      class="pt-alert mb-3 d-flex align-items-center justify-content-between"
      :class="feedback.type === 'danger' ? 'pt-alert-danger' : 'pt-alert-success'"
    >
      <span>{{ feedback.text }}</span>
      <button type="button" class="btn-close btn-sm" @click="feedback = null" />
    </div>

    <!-- ======================================================== -->
    <!-- TAB 1: DATA MEMBER (CRM & DIREKTORI PELANGGAN)           -->
    <!-- ======================================================== -->
    <div v-if="activeTab === 'members'">
      <!-- KPI Metric Summary -->
      <div class="row g-3 mb-3">
        <div class="col-md-4">
          <div class="pt-metric-card">
            <div class="text-muted small">Total Member Terdaftar</div>
            <div class="fs-4 fw-bold text-dark mt-1">{{ members.length }} Member</div>
            <div class="pt-metric-hint text-success">Aktif di sistem Playtopia</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="pt-metric-card">
            <div class="text-muted small">Kartu RFID Terhubung</div>
            <div class="fs-4 fw-bold text-dark mt-1">{{ linkedCardsCount }} Kartu</div>
            <div class="pt-metric-hint text-info">Siap tap transaksi &amp; turnstile gate</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="pt-metric-card">
            <div class="text-muted small">Total Saldo Deposit Member</div>
            <div class="fs-4 fw-bold text-dark mt-1">{{ rupiah(totalWalletBalance) }}</div>
            <div class="pt-metric-hint text-muted">Saldo tersimpan di dompet member</div>
          </div>
        </div>
      </div>

      <!-- Member Filter & Table Panel -->
      <div class="pt-panel">
        <div class="pt-panel-header d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div class="d-flex align-items-center gap-2">
            <span class="fw-semibold text-dark">Direktori Member Playtopia</span>
            <span class="pt-tag">{{ filteredMembers.length }} Member</span>
          </div>

          <div class="d-flex align-items-center gap-2">
            <div class="input-group input-group-sm" style="width: 250px;">
              <span class="input-group-text bg-white border-end-0">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                v-model="memberSearchQuery"
                type="text"
                class="form-control border-start-0 ps-0"
                placeholder="Cari nama, no. HP, kode..."
              />
            </div>
            <select v-model="memberTierFilter" class="form-select form-select-sm" style="width: 140px;">
              <option value="ALL">Semua Tier</option>
              <option value="REGULAR">Reguler</option>
              <option value="SILVER">Silver</option>
              <option value="GOLD">Gold</option>
              <option value="PLATINUM">Platinum</option>
            </select>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table pt-table align-middle mb-0">
            <thead>
              <tr>
                <th>Kode Member</th>
                <th>Nama Lengkap</th>
                <th>Kontak</th>
                <th>UID Kartu RFID</th>
                <th>Tier &amp; Benefit</th>
                <th>Status</th>
                <th>Saldo Wallet</th>
                <th class="text-end">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredMembers.length === 0">
                <td colspan="8" class="text-center text-muted py-4">Belum ada data member yang sesuai filter.</td>
              </tr>
              <tr v-for="m in filteredMembers" :key="m.id">
                <td class="font-monospace fw-semibold text-dark">{{ m.member_code }}</td>
                <td>
                  <div class="fw-medium text-dark">{{ m.full_name }}</div>
                  <div class="text-muted" style="font-size: 11px;">ID #{{ m.id }}</div>
                </td>
                <td>
                  <div>{{ m.phone }}</div>
                  <div v-if="m.email" class="text-muted" style="font-size: 11.5px;">{{ m.email }}</div>
                </td>
                <td>
                  <span v-if="m.card_uid" class="pt-tag font-monospace text-primary bg-primary-subtle border-primary-subtle">
                    {{ m.card_uid }}
                  </span>
                  <span v-else class="text-muted small fst-italic">Belum Terhubung</span>
                </td>
                <td>
                  <span class="pt-dir-badge in">{{ m.tier || m.tier_name || 'REGULAR' }} ({{ Number(m.discount_percent || 10) }}%)</span>
                </td>
                <td>
                  <span class="pt-status-badge" :class="m.status === 'active' ? 'allowed' : 'blocked'">
                    {{ m.status === 'active' ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </td>
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
    </div>

    <!-- ======================================================== -->
    <!-- TAB 2: KARTU RFID & WALLET TOP-UP (TERMINAL + HARDWARE)  -->
    <!-- ======================================================== -->
    <div v-else-if="activeTab === 'cards'">
      <!-- Hardware Terminal Simulator Section -->
      <div class="row g-3 mb-4">
        <!-- Left: RFID Reader Simulator -->
        <div class="col-lg-5">
          <div class="pt-terminal-box h-100 p-4 d-flex flex-column justify-content-between">
            <div>
              <div class="d-flex justify-content-between align-items-center mb-3">
                <span class="pt-terminal-title d-flex align-items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                  <span>TERMINAL TAP RFID</span>
                </span>
                <span class="badge bg-success-subtle text-success border border-success-subtle" style="font-size: 11px;">
                  READER READY
                </span>
              </div>

              <!-- Physical Card Mockup Display -->
              <div class="pt-card-mockup mb-3" :class="{ 'pt-card-mockup-blocked': terminalCard && terminalCard.status === 'blocked' }">
                <div class="d-flex justify-content-between align-items-center">
                  <span class="pt-card-brand">PLAYTOPIA RFID</span>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M4 4a16 16 0 0 1 16 16" />
                    <path d="M4 9a11 11 0 0 1 11 11" />
                    <path d="M4 14a6 6 0 0 1 6 6" />
                  </svg>
                </div>
                <div class="pt-card-chip my-2"></div>
                <div class="pt-card-uid font-monospace">
                  {{ terminalCard ? terminalCard.card_uid : 'SCAN ATAU TAP KARTU...' }}
                </div>
                <div class="d-flex justify-content-between align-items-end mt-2">
                  <div>
                    <div class="pt-card-holder-label">PEMILIK KARTU</div>
                    <div class="pt-card-holder-name">{{ terminalCard ? terminalCard.member_name : '-' }}</div>
                  </div>
                  <div class="text-end">
                    <div class="pt-card-holder-label">STATUS KARTU</div>
                    <div class="pt-card-status" :class="terminalCard && terminalCard.status === 'blocked' ? 'text-danger' : 'text-success'">
                      {{ terminalCard ? (terminalCard.status === 'active' ? 'AKTIF' : 'DIBLOKIR') : 'STANDBY' }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Scan Input -->
              <label class="form-label small fw-semibold text-muted">Input / Tap UID Kartu (Enter untuk membaca):</label>
              <div class="input-group mb-2">
                <span class="input-group-text bg-white">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </span>
                <input
                  v-model.trim="terminalInputUid"
                  type="text"
                  class="form-control font-monospace"
                  placeholder="Contoh: 3492817290..."
                  @keyup.enter="handleTerminalTap"
                />
                <button type="button" class="btn btn-outline-secondary" @click="handleTerminalTap">
                  Baca Kartu
                </button>
              </div>

              <!-- Quick Demo Tap Pills -->
              <div class="d-flex flex-wrap align-items-center gap-1 mt-2">
                <span class="text-muted" style="font-size: 11px;">Kartu Cepat:</span>
                <button
                  v-for="c in cards.slice(0, 3)"
                  :key="c.id"
                  type="button"
                  class="btn btn-sm btn-light border py-0 px-2 font-monospace"
                  style="font-size: 11px;"
                  @click="quickSelectCard(c)"
                >
                  {{ c.card_uid }} ({{ c.member_name }})
                </button>
              </div>
            </div>

            <div class="pt-2 border-top mt-3 text-muted" style="font-size: 11.5px;">
              Mendukung semua perangkat RFID Contactless USB Reader &amp; Keyboard Wedge 13.56MHz Mifare / 125KHz EM.
            </div>
          </div>
        </div>

        <!-- Right: Quick Top-Up Wallet Terminal -->
        <div class="col-lg-7">
          <div class="pt-panel h-100 p-4 d-flex flex-column justify-content-between">
            <div>
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="mb-0 fw-semibold text-dark">Quick Top-Up Saldo Dompet RFID</h6>
                <span v-if="terminalCard" class="pt-dir-badge in">{{ terminalCard.member_code }}</span>
              </div>

              <!-- Active Card Summary Box -->
              <div v-if="terminalCard" class="p-3 bg-light rounded-3 border mb-3">
                <div class="row align-items-center">
                  <div class="col-sm-6">
                    <div class="fw-bold text-dark fs-5">{{ terminalCard.member_name }}</div>
                    <div class="text-muted small">
                      UID: <span class="font-monospace fw-semibold">{{ terminalCard.card_uid }}</span> &middot; No: {{ terminalCard.member_phone }}
                    </div>
                  </div>
                  <div class="col-sm-6 text-sm-end mt-2 mt-sm-0">
                    <div class="text-muted small">Saldo Saat Ini</div>
                    <div class="fs-4 fw-bold text-success">{{ rupiah(terminalCard.wallet_balance || 0) }}</div>
                  </div>
                </div>
              </div>

              <div v-else class="p-4 bg-light rounded-3 border text-center text-muted mb-3" style="font-size: 13px;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="mb-2 text-secondary">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                <div>Belum ada kartu RFID yang dibaca di terminal.</div>
                <div class="small mt-1 text-secondary">Tap kartu di sebelah kiri atau pilih salah satu kartu dari tabel di bawah.</div>
              </div>

              <!-- Top-Up Nominal Presets -->
              <div v-if="terminalCard">
                <label class="form-label small fw-semibold text-dark">Pilih Nominal Top-Up:</label>
                <div class="d-flex flex-wrap gap-2 mb-3">
                  <button
                    v-for="amt in [25000, 50000, 100000, 200000, 500000]"
                    :key="amt"
                    type="button"
                    class="pt-btn-outline"
                    :class="{ 'border-primary text-primary fw-bold bg-primary-subtle': terminalAmount === amt }"
                    @click="terminalAmount = amt"
                  >
                    +{{ rupiah(amt) }}
                  </button>
                </div>

                <div class="row g-2 mb-3">
                  <div class="col-sm-6">
                    <label class="form-label small fw-semibold">Nominal Kustom (Rp)</label>
                    <input
                      v-model.number="terminalAmount"
                      type="number"
                      min="10000"
                      step="10000"
                      class="form-control fw-semibold"
                    />
                  </div>
                  <div class="col-sm-6">
                    <label class="form-label small fw-semibold">Metode Pembayaran Kasir</label>
                    <select v-model="terminalPaymentMethod" class="form-select">
                      <option value="CASH">Tunai (Cash)</option>
                      <option value="QRIS">QRIS Dinamis</option>
                      <option value="DEBIT">Debit / EDC Bank</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <!-- Action Submit Top-up -->
            <div v-if="terminalCard" class="d-flex justify-content-between align-items-center pt-3 border-top mt-3">
              <div class="small text-muted">
                Saldo setelah top-up: <strong class="text-dark">{{ rupiah((terminalCard.wallet_balance || 0) + (terminalAmount || 0)) }}</strong>
              </div>
              <button
                type="button"
                class="pt-btn-primary"
                :disabled="terminalAmount < 10000 || saving || terminalCard.status === 'blocked'"
                @click="submitTerminalTopup"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{{ saving ? 'Memproses...' : 'Proses Top-Up Sekarang' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Physical Card Table Panel -->
      <div class="pt-panel">
        <div class="pt-panel-header d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div class="d-flex align-items-center gap-2">
            <span class="fw-semibold text-dark">Daftar Fisik Kartu RFID &amp; Kontrol Keamanan</span>
            <span class="pt-tag">{{ filteredCards.length }} Kartu Terbit</span>
          </div>

          <div class="d-flex align-items-center gap-2">
            <div class="input-group input-group-sm" style="width: 250px;">
              <span class="input-group-text bg-white border-end-0">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                v-model="cardSearchQuery"
                type="text"
                class="form-control border-start-0 ps-0"
                placeholder="Cari UID kartu, nama pemilik..."
              />
            </div>
            <select v-model="cardStatusFilter" class="form-select form-select-sm" style="width: 140px;">
              <option value="ALL">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="blocked">Diblokir / Hilang</option>
            </select>
          </div>
        </div>

        <div class="table-responsive">
          <table class="table pt-table align-middle mb-0">
            <thead>
              <tr>
                <th>UID Kartu RFID</th>
                <th>Pemilik Kartu</th>
                <th>Kontak</th>
                <th>Saldo Wallet</th>
                <th>Tanggal Terbit</th>
                <th>Status Kartu</th>
                <th class="text-end">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredCards.length === 0">
                <td colspan="7" class="text-center text-muted py-4">Belum ada kartu RFID yang terdaftar.</td>
              </tr>
              <tr v-for="c in filteredCards" :key="c.id">
                <td>
                  <span class="pt-tag font-monospace fw-semibold text-dark bg-light border">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                    </svg>
                    {{ c.card_uid }}
                  </span>
                </td>
                <td>
                  <div class="fw-medium text-dark">{{ c.member_name }}</div>
                  <div class="text-muted" style="font-size: 11px;">{{ c.member_code }}</div>
                </td>
                <td>{{ c.member_phone }}</td>
                <td class="fw-semibold text-dark">{{ rupiah(c.wallet_balance || 0) }}</td>
                <td class="text-muted" style="font-size: 12.5px;">{{ formatDate(c.issued_at || c.created_at) }}</td>
                <td>
                  <span class="pt-status-badge" :class="c.status === 'active' ? 'allowed' : 'blocked'">
                    {{ c.status === 'active' ? 'Aktif' : 'Diblokir / Hilang' }}
                  </span>
                </td>
                <td class="text-end">
                  <div class="d-inline-flex gap-1">
                    <button
                      type="button"
                      class="pt-btn-outline"
                      style="padding: 4px 9px; font-size: 12px;"
                      title="Muat kartu ini ke Terminal Top-Up di atas"
                      @click="quickSelectCard(c)"
                    >
                      Pilih Kartu
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm"
                      :class="c.status === 'active' ? 'btn-outline-danger' : 'btn-outline-success'"
                      style="font-size: 12px; padding: 4px 9px;"
                      @click="toggleCardStatus(c)"
                    >
                      {{ c.status === 'active' ? 'Blokir Kartu' : 'Buka Blokir' }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- TAB 3: PAKET MEMBERSHIP (CRUD PAKET SUBSCRIPTION)       -->
    <!-- ======================================================== -->
    <div v-else-if="activeTab === 'plans'">
      <div class="row g-3">
        <div v-if="plans.length === 0" class="col-12">
          <div class="pt-panel p-5 text-center text-muted">
            Belum ada paket membership. Klik tombol "+ Tambah Paket Membership" di atas untuk menambahkan paket baru.
          </div>
        </div>

        <div v-for="pl in plans" :key="pl.id" class="col-md-6 col-lg-4">
          <div class="pt-panel p-4 h-100 d-flex flex-column justify-content-between position-relative">
            <div>
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="pt-dir-badge in">PAKET MEMBERSHIP</span>
                <div class="d-flex align-items-center gap-1">
                  <span class="pt-tag">{{ pl.duration_days }} Hari</span>
                  <span class="pt-status-badge" :class="pl.is_active ? 'allowed' : 'blocked'">
                    {{ pl.is_active ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </div>
              </div>

              <h5 class="fw-semibold text-dark mb-1">{{ pl.name }}</h5>
              <div class="fs-4 fw-bold text-dark my-2">{{ rupiah(pl.price) }}</div>

              <ul class="list-unstyled text-muted mb-0 mt-3 pt-3 border-top" style="font-size: 13px;">
                <li class="mb-2 d-flex align-items-center gap-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Kuota Kunjungan: <strong class="text-dark">{{ pl.included_entries_label || (pl.duration_days >= 365 ? 'Sepuasnya (VIP)' : '5x Masuk') }}</strong></span>
                </li>
                <li class="mb-2 d-flex align-items-center gap-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Diskon Transaksi POS: <strong class="text-dark">{{ pl.discount_percent }}%</strong></span>
                </li>
                <li class="mb-2 d-flex align-items-center gap-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Masa Berlaku: <strong class="text-dark">{{ pl.duration_days }} Hari Kalender</strong></span>
                </li>
                <li class="d-flex align-items-center gap-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Berlaku di seluruh outlet playground</span>
                </li>
              </ul>
            </div>

            <!-- Plan Actions -->
            <div class="d-flex justify-content-end gap-2 pt-3 border-top mt-3">
              <button
                type="button"
                class="pt-btn-outline"
                style="padding: 5px 12px; font-size: 12.5px;"
                @click="openEditPlanModal(pl)"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span>Edit Paket</span>
              </button>
              <button
                type="button"
                class="btn btn-sm btn-outline-danger"
                style="padding: 5px 12px; font-size: 12.5px;"
                @click="deletePlan(pl)"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- TAB 4: VOUCHERS & PROMO DISKON                          -->
    <!-- ======================================================== -->
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

    <!-- ======================================================== -->
    <!-- MODAL: REGISTRASI MEMBER                                 -->
    <!-- ======================================================== -->
    <div v-if="showMemberModal" class="pt-modal-backdrop">
      <div class="pt-panel" style="max-width: 480px; width: 100%;">
        <div class="pt-panel-header d-flex justify-content-between align-items-center">
          <span class="fw-semibold text-dark">Registrasi Member Baru</span>
          <button type="button" class="btn-close btn-sm" @click="showMemberModal = false" />
        </div>
        <div class="p-3">
          <div class="mb-2">
            <label class="form-label small fw-semibold">Nama Lengkap</label>
            <input v-model.trim="memberForm.full_name" type="text" class="form-control" placeholder="Nama lengkap member">
          </div>
          <div class="row g-2 mb-2">
            <div class="col-6">
              <label class="form-label small fw-semibold">No. Telepon (WhatsApp)</label>
              <input v-model.trim="memberForm.phone" type="text" class="form-control" placeholder="0812...">
            </div>
            <div class="col-6">
              <label class="form-label small fw-semibold">Tier Membership</label>
              <select v-model="memberForm.tier" class="form-select">
                <option value="REGULAR">REGULAR (Diskon 5%)</option>
                <option value="SILVER">SILVER (Diskon 10%)</option>
                <option value="GOLD">GOLD (Diskon 15%)</option>
                <option value="PLATINUM">PLATINUM (Diskon 20%)</option>
              </select>
            </div>
          </div>
          <div class="mb-2">
            <label class="form-label small fw-semibold">Email (Opsional)</label>
            <input v-model.trim="memberForm.email" type="email" class="form-control" placeholder="member@email.com">
          </div>
          <div class="row g-2 mb-3">
            <div class="col-6">
              <label class="form-label small fw-semibold">UID Kartu RFID</label>
              <input v-model.trim="memberForm.card_uid" type="text" class="form-control font-monospace" placeholder="Scan UID kartu...">
            </div>
            <div class="col-6">
              <label class="form-label small fw-semibold">Saldo Awal Deposit (Rp)</label>
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

    <!-- ======================================================== -->
    <!-- MODAL: HUBUNGKAN KARTU RFID KE MEMBER                    -->
    <!-- ======================================================== -->
    <div v-if="showCardModal" class="pt-modal-backdrop">
      <div class="pt-panel" style="max-width: 460px; width: 100%;">
        <div class="pt-panel-header d-flex justify-content-between align-items-center">
          <span class="fw-semibold text-dark">Hubungkan Kartu RFID ke Member</span>
          <button type="button" class="btn-close btn-sm" @click="showCardModal = false" />
        </div>
        <div class="p-3">
          <div class="mb-3">
            <label class="form-label small fw-semibold">Pilih Member</label>
            <select v-model="cardForm.member_id" class="form-select">
              <option :value="null" disabled>-- Pilih Member Terdaftar --</option>
              <option v-for="m in members" :key="m.id" :value="m.id">
                {{ m.member_code }} - {{ m.full_name }} ({{ m.phone }})
              </option>
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label small fw-semibold">UID Kartu Fisik RFID</label>
            <input
              v-model.trim="cardForm.card_uid"
              type="text"
              class="form-control font-monospace"
              placeholder="Scan atau ketik UID kartu, misal: 3492817290"
            />
            <div class="form-text" style="font-size: 11.5px;">
              Pastikan kartu belum digunakan secara aktif oleh member lain.
            </div>
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="pt-btn-outline" @click="showCardModal = false">Batal</button>
            <button
              type="button"
              class="pt-btn-primary"
              :disabled="!cardForm.member_id || !cardForm.card_uid || saving"
              @click="submitIssueCard"
            >
              {{ saving ? 'Menyimpan...' : 'Hubungkan Kartu' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODAL: TAMBAH / EDIT PAKET MEMBERSHIP                    -->
    <!-- ======================================================== -->
    <div v-if="showPlanModal" class="pt-modal-backdrop">
      <div class="pt-panel" style="max-width: 480px; width: 100%;">
        <div class="pt-panel-header d-flex justify-content-between align-items-center">
          <span class="fw-semibold text-dark">
            {{ editingPlanId ? 'Edit Paket Membership' : 'Tambah Paket Membership Baru' }}
          </span>
          <button type="button" class="btn-close btn-sm" @click="showPlanModal = false" />
        </div>
        <div class="p-3">
          <div class="mb-2">
            <label class="form-label small fw-semibold">Nama Paket Membership</label>
            <input
              v-model.trim="planForm.name"
              type="text"
              class="form-control"
              placeholder="Contoh: Playmiles Platinum VIP (6 Bulan)"
            />
          </div>
          <div class="row g-2 mb-2">
            <div class="col-6">
              <label class="form-label small fw-semibold">Harga Langganan (Rp)</label>
              <input
                v-model.number="planForm.price"
                type="number"
                min="0"
                step="25000"
                class="form-control fw-semibold"
                placeholder="250000"
              />
            </div>
            <div class="col-6">
              <label class="form-label small fw-semibold">Masa Berlaku (Hari)</label>
              <input
                v-model.number="planForm.valid_days"
                type="number"
                min="1"
                step="30"
                class="form-control"
                placeholder="180"
              />
            </div>
          </div>
          <div class="row g-2 mb-3">
            <div class="col-6">
              <label class="form-label small fw-semibold">Diskon Belanja POS (%)</label>
              <input
                v-model.number="planForm.discount_percent"
                type="number"
                min="0"
                max="100"
                step="5"
                class="form-control"
                placeholder="15"
              />
            </div>
            <div class="col-6">
              <label class="form-label small fw-semibold">Status Paket</label>
              <select v-model="planForm.is_active" class="form-select">
                <option :value="1">Aktif (Tersedia)</option>
                <option :value="0">Nonaktif</option>
              </select>
            </div>
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="pt-btn-outline" @click="showPlanModal = false">Batal</button>
            <button
              type="button"
              class="pt-btn-primary"
              :disabled="!planForm.name || planForm.price === null || saving"
              @click="submitPlan"
            >
              {{ saving ? 'Menyimpan...' : (editingPlanId ? 'Perbarui Paket' : 'Simpan Paket') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODAL: TOP-UP SALDO MEMBER (UNIVERSAL)                   -->
    <!-- ======================================================== -->
    <div v-if="topupTarget" class="pt-modal-backdrop">
      <div class="pt-panel" style="max-width: 440px; width: 100%;">
        <div class="pt-panel-header d-flex justify-content-between align-items-center">
          <span class="fw-semibold text-dark">Top-Up Saldo Kartu Member</span>
          <button type="button" class="btn-close btn-sm" @click="topupTarget = null" />
        </div>
        <div class="p-3">
          <div class="p-3 bg-light rounded-2 border mb-3" style="font-size: 13px;">
            <div class="fw-semibold text-dark">{{ topupTarget.full_name || topupTarget.member_name }}</div>
            <div class="text-muted mt-1">
              Kode: <span class="font-monospace">{{ topupTarget.member_code }}</span> &middot; Saldo: <strong>{{ rupiah(topupTarget.wallet_balance) }}</strong>
            </div>
          </div>
          <label class="form-label small fw-semibold">Nominal Top-Up (Rp)</label>
          <input v-model.number="topupAmount" type="number" min="10000" step="50000" class="form-control fw-semibold mb-2">
          <div class="d-flex flex-wrap gap-2 mb-3">
            <button type="button" class="pt-btn-outline" style="padding: 4px 10px; font-size: 12px;" @click="topupAmount = 50000">Rp 50.000</button>
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

    <!-- ======================================================== -->
    <!-- MODAL: BUAT VOUCHER                                      -->
    <!-- ======================================================== -->
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
const cards = ref([])
const plans = ref([])
const vouchers = ref([])
const feedback = ref(null)
const loading = ref(false)
const saving = ref(false)

const pageTitle = computed(() => {
  if (activeTab.value === 'cards') return 'Kartu RFID & Wallet Top-Up'
  if (activeTab.value === 'plans') return 'Paket Membership'
  if (activeTab.value === 'vouchers') return 'Voucher Diskon'
  return 'Data Member'
})

const pageSubtitle = computed(() => {
  if (activeTab.value === 'cards') return 'Terminal tap kartu RFID, kontrol keamanan kartu (Aktif/Blokir), dan pengisian saldo deposit'
  if (activeTab.value === 'plans') return 'Konfigurasi paket langganan playground, durasi masa aktif, kuota kunjungan, dan diskon POS'
  if (activeTab.value === 'vouchers') return 'Pengaturan kode kupon dan potongan harga transaksi kasir POS'
  return 'Direktori pelanggan terdaftar, tier membership, poin loyalitas, dan saldo dompet'
})

// Tab Members CRM state
const memberSearchQuery = ref('')
const memberTierFilter = ref('ALL')

const filteredMembers = computed(() => {
  let list = members.value
  if (memberTierFilter.value !== 'ALL') {
    list = list.filter(m => (m.tier || m.tier_name || 'REGULAR').toUpperCase() === memberTierFilter.value)
  }
  if (memberSearchQuery.value) {
    const q = memberSearchQuery.value.toLowerCase()
    list = list.filter(m =>
      (m.full_name || '').toLowerCase().includes(q) ||
      (m.member_code || '').toLowerCase().includes(q) ||
      (m.phone || '').toLowerCase().includes(q) ||
      (m.card_uid || '').toLowerCase().includes(q)
    )
  }
  return list
})

const linkedCardsCount = computed(() => {
  return members.value.filter(m => !!m.card_uid).length
})

const totalWalletBalance = computed(() => {
  return members.value.reduce((acc, m) => acc + (Number(m.wallet_balance) || 0), 0)
})

// Tab Cards Terminal state
const cardSearchQuery = ref('')
const cardStatusFilter = ref('ALL')
const terminalInputUid = ref('')
const terminalCard = ref(null)
const terminalAmount = ref(100000)
const terminalPaymentMethod = ref('CASH')

const filteredCards = computed(() => {
  let list = cards.value
  if (cardStatusFilter.value !== 'ALL') {
    list = list.filter(c => c.status === cardStatusFilter.value)
  }
  if (cardSearchQuery.value) {
    const q = cardSearchQuery.value.toLowerCase()
    list = list.filter(c =>
      (c.card_uid || '').toLowerCase().includes(q) ||
      (c.member_name || '').toLowerCase().includes(q) ||
      (c.member_code || '').toLowerCase().includes(q) ||
      (c.member_phone || '').toLowerCase().includes(q)
    )
  }
  return list
})

function quickSelectCard(c) {
  terminalCard.value = c
  terminalInputUid.value = c.card_uid
}

function handleTerminalTap() {
  const q = terminalInputUid.value.trim()
  if (!q) return
  const found = cards.value.find(c => c.card_uid === q)
  if (found) {
    terminalCard.value = found
    feedback.value = { type: 'success', text: `Kartu RFID ${q} berhasil dibaca. Pemilik: ${found.member_name}` }
  } else {
    // If not found in cards list, check in members
    const mFound = members.value.find(m => m.card_uid === q)
    if (mFound) {
      terminalCard.value = {
        id: mFound.id,
        member_id: mFound.id,
        card_uid: mFound.card_uid,
        status: mFound.card_status || 'active',
        member_name: mFound.full_name,
        member_code: mFound.member_code,
        member_phone: mFound.phone,
        wallet_balance: mFound.wallet_balance
      }
      feedback.value = { type: 'success', text: `Kartu RFID ${q} berhasil dibaca. Pemilik: ${mFound.full_name}` }
    } else {
      feedback.value = { type: 'danger', text: `Kartu dengan UID "${q}" tidak ditemukan di database Playtopia.` }
    }
  }
}

async function submitTerminalTopup() {
  if (!terminalCard.value) return
  saving.value = true
  try {
    const res = await api(`/admin/members/${terminalCard.value.member_id}/topup`, {
      method: 'POST',
      body: { amount: terminalAmount.value }
    })
    const newBal = res.data?.new_balance ?? ((terminalCard.value.wallet_balance || 0) + terminalAmount.value)
    terminalCard.value.wallet_balance = newBal
    feedback.value = {
      type: 'success',
      text: `Top-Up sebesar ${rupiah(terminalAmount.value)} untuk ${terminalCard.value.member_name} (${terminalPaymentMethod.value}) berhasil! Saldo baru: ${rupiah(newBal)}`
    }
    await loadData()
    // Re-sync selected card
    const refreshed = cards.value.find(c => c.card_uid === terminalCard.value.card_uid)
    if (refreshed) terminalCard.value = refreshed
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  } finally {
    saving.value = false
  }
}

async function toggleCardStatus(c) {
  const target = c.status === 'active' ? 'blocked' : 'active'
  const actionText = target === 'blocked' ? 'blokir' : 'aktifkan kembali'
  if (!window.confirm(`Yakin ingin me-${actionText} kartu RFID "${c.card_uid}" milik ${c.member_name}?`)) {
    return
  }
  saving.value = true
  try {
    const res = await api(`/admin/member-cards/${c.id}/status`, {
      method: 'PUT',
      body: { status: target }
    })
    feedback.value = { type: 'success', text: res.message || `Status kartu berhasil diubah menjadi ${target}.` }
    await loadData()
    if (terminalCard.value && terminalCard.value.id === c.id) {
      terminalCard.value.status = target
    }
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  } finally {
    saving.value = false
  }
}

// Modals state
const showMemberModal = ref(false)
const showCardModal = ref(false)
const showPlanModal = ref(false)
const showVoucherModal = ref(false)
const topupTarget = ref(null)
const topupAmount = ref(100000)

const memberForm = reactive({
  full_name: '',
  phone: '',
  email: '',
  tier: 'SILVER',
  card_uid: '',
  initial_balance: 100000
})

const cardForm = reactive({
  member_id: null,
  card_uid: ''
})

const editingPlanId = ref(null)
const planForm = reactive({
  name: '',
  price: 150000,
  valid_days: 90,
  discount_percent: 10,
  is_active: 1
})

const voucherForm = reactive({
  code: '',
  name: '',
  discount_type: 'percentage',
  discount_value: 15,
  min_order_amount: 100000,
  quota: 100
})

function openIssueCardModal() {
  cardForm.member_id = members.value[0]?.id || null
  cardForm.card_uid = ''
  showCardModal.value = true
}

async function submitIssueCard() {
  if (!cardForm.member_id || !cardForm.card_uid) return
  saving.value = true
  try {
    const res = await api('/admin/member-cards', {
      method: 'POST',
      body: { member_id: cardForm.member_id, card_uid: cardForm.card_uid }
    })
    showCardModal.value = false
    feedback.value = { type: 'success', text: res.message || 'Kartu RFID berhasil dihubungkan ke member!' }
    await loadData()
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  } finally {
    saving.value = false
  }
}

function openCreatePlanModal() {
  editingPlanId.value = null
  planForm.name = ''
  planForm.price = 150000
  planForm.valid_days = 90
  planForm.discount_percent = 10
  planForm.is_active = 1
  showPlanModal.value = true
}

function openEditPlanModal(pl) {
  editingPlanId.value = pl.id
  planForm.name = pl.name
  planForm.price = Number(pl.price)
  planForm.valid_days = Number(pl.valid_days || pl.duration_days || 90)
  planForm.discount_percent = Number(pl.discount_percent || 10)
  planForm.is_active = pl.is_active ? 1 : 0
  showPlanModal.value = true
}

async function submitPlan() {
  saving.value = true
  try {
    if (editingPlanId.value) {
      const res = await api(`/admin/membership-plans/${editingPlanId.value}`, {
        method: 'PUT',
        body: { ...planForm }
      })
      feedback.value = { type: 'success', text: res.message || 'Paket membership berhasil diperbarui.' }
    } else {
      const res = await api('/admin/membership-plans', {
        method: 'POST',
        body: { ...planForm }
      })
      feedback.value = { type: 'success', text: res.message || 'Paket membership baru berhasil ditambahkan.' }
    }
    showPlanModal.value = false
    await loadData()
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  } finally {
    saving.value = false
  }
}

async function deletePlan(pl) {
  if (!window.confirm(`Yakin ingin menghapus paket "${pl.name}"?`)) return
  saving.value = true
  try {
    const res = await api(`/admin/membership-plans/${pl.id}`, { method: 'DELETE' })
    feedback.value = { type: 'success', text: res.message || 'Paket membership berhasil dihapus.' }
    await loadData()
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  } finally {
    saving.value = false
  }
}

watch(() => route.path, (p) => {
  activeTab.value = resolveTab(p)
})

function formatDate(dt) {
  if (!dt) return '-'
  try {
    const d = new Date(dt)
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return dt
  }
}

async function loadData() {
  loading.value = true
  try {
    const res = await api('/admin/members-promo')
    if (res.success && res.data) {
      members.value = res.data.members || []
      cards.value = res.data.cards || []
      plans.value = res.data.plans || []
      vouchers.value = res.data.vouchers || []

      // If cards array is empty but members have card_uid, derive card rows
      if (cards.value.length === 0 && members.value.length > 0) {
        cards.value = members.value
          .filter(m => !!m.card_uid)
          .map(m => ({
            id: m.id,
            member_id: m.id,
            card_uid: m.card_uid,
            status: m.card_status || 'active',
            member_name: m.full_name,
            member_code: m.member_code,
            member_phone: m.phone,
            wallet_balance: m.wallet_balance,
            issued_at: m.created_at
          }))
      }

      // Default terminal card if none selected
      if (!terminalCard.value && cards.value.length > 0) {
        terminalCard.value = cards.value[0]
        terminalInputUid.value = cards.value[0].card_uid
      }
    }
  } catch (err) {
    feedback.value = { type: 'danger', text: err.message }
  } finally {
    loading.value = false
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
      text: `Top-up sebesar ${rupiah(topupAmount.value)} untuk ${topupTarget.value.full_name || topupTarget.value.member_name} berhasil. Saldo baru: ${rupiah(res.data?.new_balance)}`
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

.pt-metric-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 16px 18px;
}

.pt-metric-hint {
  font-size: 11.5px;
  margin-top: 4px;
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

.pt-status-badge.blocked {
  background: #fee2e2;
  color: #b91c1c;
}

/* RFID Hardware Terminal Box */
.pt-terminal-box {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.pt-terminal-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #1e293b;
}

.pt-card-mockup {
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #00729c 100%);
  color: #ffffff;
  border-radius: 14px;
  padding: 18px 20px;
  box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.25);
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.pt-card-mockup-blocked {
  background: linear-gradient(135deg, #450a0a 0%, #7f1d1d 50%, #991b1b 100%) !important;
  box-shadow: 0 10px 25px -5px rgba(153, 27, 27, 0.35) !important;
}

.pt-card-brand {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #5cd2ff;
}

.pt-card-chip {
  width: 38px;
  height: 28px;
  background: linear-gradient(135deg, #fef08a 0%, #eab308 100%);
  border-radius: 5px;
  border: 1px solid #ca8a04;
}

.pt-card-uid {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  color: #f8fafc;
}

.pt-card-holder-label {
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #94a3b8;
}

.pt-card-holder-name {
  font-size: 13px;
  font-weight: 600;
  color: #f1f5f9;
}

.pt-card-status {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
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
