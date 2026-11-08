<template>
  <div class="playtopia-auth-page min-vh-100 d-flex align-items-center justify-content-center py-4 px-3">
    <div class="auth-wrapper w-100" style="max-width: 920px;">
      <div class="row g-0 shadow-lg rounded-4 overflow-hidden bg-white border border-info-subtle">
        <!-- Left Panel: Brand & Quick Role Selector -->
        <div class="col-lg-6 p-4 p-md-5 d-flex flex-column justify-content-between auth-left-panel">
          <div>
            <div class="bg-white d-inline-block p-3 rounded-4 shadow-sm mb-4">
              <img :src="PlaytopiaLogo" alt="Playtopia Indonesia" style="max-height: 48px;" />
            </div>
            <h3 class="fw-bold text-white mb-2">
              Integrated POS &amp; Smart Gate System
            </h3>
            <p class="text-white-50 small mb-4">
              Sistem terpadu Kasir Touchscreen, Gelang/Kartu RFID, Tripod Turnstile Gate, dan Manajemen Multi-Role berdasarkan grup menu.
            </p>

            <!-- Interactive Quick Login Role Cards -->
            <div class="mb-2">
              <div class="text-white small fw-bold text-uppercase mb-2" style="letter-spacing: 0.8px;">
                ⚡ Pilih Role Cepat (Klik untuk Isi Otomatis):
              </div>

              <div class="d-flex flex-column gap-2">
                <button
                  v-for="r in demoRoles"
                  :key="r.email"
                  type="button"
                  class="role-pick-btn text-start p-3 rounded-3 border-0 d-flex align-items-center gap-3 w-100"
                  :class="{ selected: email === r.email }"
                  :disabled="auth.isLoggingIn"
                  @click="selectDemoRole(r)"
                >
                  <span class="role-pick-icon">{{ r.icon }}</span>
                  <div class="flex-grow-1 lh-sm">
                    <div class="d-flex align-items-center justify-content-between">
                      <strong class="text-dark">{{ r.title }}</strong>
                      <span class="badge rounded-pill" :class="r.badgeClass">{{ r.role }}</span>
                    </div>
                    <div class="text-muted mt-1" style="font-size: 11.5px;">{{ r.desc }}</div>
                    <div class="font-monospace text-primary mt-1" style="font-size: 11px;">
                      {{ r.email }} / {{ r.password }}
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div class="text-white-50 small mt-4 pt-2 border-top border-white border-opacity-25 d-flex justify-content-between">
            <span>&copy; 2026 Playtopia Indonesia</span>
            <span>JWT + MySQL RBAC</span>
          </div>
        </div>

        <!-- Right Panel: Login Form -->
        <div class="col-lg-6 p-4 p-md-5 d-flex flex-column justify-content-center bg-white">
          <div class="mb-4">
            <span class="badge badge-play-sky rounded-pill px-3 py-1 mb-2">🔐 Autentikasi Keamanan JWT</span>
            <h4 class="fw-bold text-dark mb-1">Masuk ke Portal Playtopia</h4>
            <p class="text-muted small mb-0">
              Menu yang tampil akan otomatis menyesuaikan dengan Role &amp; Group Permission Anda.
            </p>
          </div>

          <div
            v-if="notice"
            class="alert alert-sm mb-3 rounded-3"
            :class="notice.type === 'warning' ? 'alert-warning' : 'alert-info'"
            role="alert"
          >
            {{ notice.text }}
          </div>

          <form novalidate @submit.prevent="submit">
            <div
              v-if="errorMessage"
              class="alert alert-danger alert-sm mb-3 rounded-3"
              role="alert"
            >
              ⚠️ {{ errorMessage }}
            </div>

            <div class="mb-3">
              <label class="form-label small fw-bold text-dark">Email Akun:</label>
              <input
                v-model.trim="email"
                class="form-control form-control-lg"
                type="email"
                name="email"
                placeholder="admin@playtopia.id"
                autocomplete="username"
                :disabled="auth.isLoggingIn"
                @input="errorMessage = ''"
              >
            </div>

            <div class="mb-4">
              <label class="form-label small fw-bold text-dark">Kata Sandi:</label>
              <div class="input-group">
                <input
                  v-model="password"
                  class="form-control form-control-lg"
                  :type="showPassword ? 'text' : 'password'"
                  name="password"
                  placeholder="••••••••"
                  autocomplete="current-password"
                  :disabled="auth.isLoggingIn"
                  @input="errorMessage = ''"
                >
                <button
                  type="button"
                  class="btn btn-outline-secondary px-3"
                  :disabled="auth.isLoggingIn"
                  @click="showPassword = !showPassword"
                >
                  {{ showPassword ? '🙈' : '👁️' }}
                </button>
              </div>
            </div>

            <button
              type="submit"
              class="btn btn-play-sky btn-lg w-100 py-3 fw-bold text-white"
              :disabled="!canSubmit"
            >
              <span
                v-if="auth.isLoggingIn"
                class="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              />
              {{ auth.isLoggingIn ? 'Memvalidasi Sesi & Role...' : '🚀 Masuk Sekarang' }}
            </button>
          </form>

          <div class="mt-4 pt-3 border-top text-center">
            <a href="/customer-display" target="_blank" class="btn btn-sm btn-outline-info rounded-pill px-3">
              🖥️ Buka Layar Pelanggan (Customer Display)
            </a>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePosAuthStore } from '@/stores/posAuth'
import PlaytopiaLogo from '@/assets/playtopia-logo.png'

const route = useRoute()
const router = useRouter()
const auth = usePosAuthStore()

const email = ref('admin@playtopia.id')
const password = ref('admin123')
const showPassword = ref(false)
const errorMessage = ref('')

const demoRoles = [
  {
    role: 'Admin',
    title: 'Administrator Sistem',
    icon: '🛡️',
    email: 'admin@playtopia.id',
    password: 'admin123',
    badgeClass: 'badge-play-pink',
    desc: 'Akses penuh 8 Group Menu: Role Matrix, User, Menu, Katalog, Kasir & Gate'
  },
  {
    role: 'Client (Owner)',
    title: 'Owner Playtopia',
    icon: '👑',
    email: 'owner@playtopia.id',
    password: 'owner123',
    badgeClass: 'badge-play-amber',
    desc: 'Dashboard Eksekutif, Laporan Penjualan, Approval Closing, Voucher & Promo'
  },
  {
    role: 'Staff (Kasir)',
    title: 'Kasir Operasional',
    icon: '🧑‍💻',
    email: 'kasir@playtopia.id',
    password: 'kasir123',
    badgeClass: 'badge-play-sky',
    desc: 'Kasir POS Touchscreen, Check-in Gate, Member Top-Up & Closing Shift'
  }
]

const emailValid = computed(() => /^\S+@\S+\.\S+$/.test(email.value))
const canSubmit = computed(() => emailValid.value && password.value.length > 0 && !auth.isLoggingIn)

const notice = computed(() => {
  if (route.query.reason === 'expired') {
    return { type: 'warning', text: 'Sesi login Anda telah berakhir (expired). Silakan login kembali.' }
  }
  if (route.query.reason === 'unauthorized') {
    return { type: 'info', text: 'Please sign in to access the system.' }
  }
  return null
})

function selectDemoRole(r) {
  email.value = r.email
  password.value = r.password
  errorMessage.value = ''
}

async function submit() {
  if (!canSubmit.value) return
  errorMessage.value = ''
  try {
    const data = await auth.login(email.value, password.value)
    if (typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/app')) {
      router.replace(route.query.redirect)
      return
    }
    if (data?.user?.role === 'Admin' || data?.user?.role === 'Client') {
      router.replace('/app/dashboard')
    } else {
      router.replace('/app/pos')
    }
  } catch (err) {
    errorMessage.value = err.message
    password.value = ''
  }
}
</script>

<style scoped>
.playtopia-auth-page {
  background: radial-gradient(circle at top left, #e0f7ff 0%, #fce7f3 50%, #f0f9ff 100%);
}

.auth-left-panel {
  background: linear-gradient(145deg, #0284c7 0%, #0369a1 55%, #db2777 100%);
}

.role-pick-btn {
  background: rgba(255, 255, 255, 0.92);
  transition: all 0.18s ease;
  cursor: pointer;
}

.role-pick-btn:hover:not(:disabled) {
  background: #ffffff;
  transform: translateX(4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.role-pick-btn.selected {
  background: #ffffff;
  outline: 3px solid #fde047;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.16);
}

.role-pick-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: #f0f9ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

/* Footer */
.login-footer-link {
  text-align: center;
  margin-top: 18px;
}

.login-footer-link a {
  font-size: 12.5px;
  color: #94a3b8;
  text-decoration: none;
  transition: color 0.15s;
}

.login-footer-link a:hover {
  color: #6366f1;
  text-decoration: underline;
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .login-card {
    flex-direction: column;
    max-width: 440px;
    min-height: auto;
  }

  .login-left-panel {
    min-height: 180px;
    flex: 0 0 180px;
  }

  .login-right-panel {
    padding: 28px 24px;
  }

  .orb-1 { width: 180px; height: 180px; }
  .orb-2 { width: 100px; height: 100px; }
}
</style>
