<template>
  <div class="playtopia-auth-page min-vh-100 d-flex align-items-center justify-content-center py-4 px-3">
    <div class="auth-wrapper w-100" style="max-width: 900px;">
      <div class="row g-0 shadow-sm rounded-3 overflow-hidden bg-white border">
        <!-- Left Panel: Brand & Quick Role Selector -->
        <div class="col-lg-6 p-4 p-md-5 d-flex flex-column justify-content-between auth-left-panel">
          <div>
            <div class="bg-white d-inline-block px-3 py-2 rounded-3 mb-4">
              <img :src="PlaytopiaLogo" alt="Playtopia Indonesia" style="max-height: 40px;" />
            </div>
            <h4 class="fw-bold text-white mb-2">
              Playtopia POS &amp; Access System
            </h4>
            <p class="text-white-50 small mb-4">
              Sistem manajemen operasional Kasir POS, kartu RFID, Turnstile Gate, dan akses grup menu berbasis role.
            </p>

            <!-- Interactive Quick Login Role Cards -->
            <div class="mb-2">
              <div class="text-white-50 small fw-semibold text-uppercase mb-2" style="letter-spacing: 0.05em;">
                Pilih Akun Demo (Klik untuk Isi Otomatis)
              </div>

              <div class="d-flex flex-column gap-2">
                <button
                  v-for="r in demoRoles"
                  :key="r.email"
                  type="button"
                  class="role-pick-btn text-start p-3 rounded-2 border-0 d-flex align-items-center justify-content-between gap-3 w-100"
                  :class="{ selected: email === r.email }"
                  :disabled="auth.isLoggingIn"
                  @click="selectDemoRole(r)"
                >
                  <div class="lh-sm">
                    <div class="fw-semibold text-dark" style="font-size: 13.5px;">{{ r.title }}</div>
                    <div class="text-muted mt-1" style="font-size: 11.5px;">{{ r.desc }}</div>
                    <div class="font-monospace text-primary mt-1" style="font-size: 11px;">
                      {{ r.email }} / {{ r.password }}
                    </div>
                  </div>
                  <span class="badge rounded-pill" :class="r.badgeClass">{{ r.role }}</span>
                </button>
              </div>
            </div>
          </div>

          <div class="text-white-50 small mt-4 pt-3 border-top border-white border-opacity-25 d-flex justify-content-between">
            <span>&copy; 2026 Playtopia Indonesia</span>
            <span>MySQL RBAC</span>
          </div>
        </div>

        <!-- Right Panel: Login Form -->
        <div class="col-lg-6 p-4 p-md-5 d-flex flex-column justify-content-center bg-white">
          <div class="mb-4">
            <h4 class="fw-bold text-dark mb-1">Masuk ke Sistem</h4>
            <p class="text-muted small mb-0">
              Menu yang tampil akan otomatis menyesuaikan dengan Role &amp; Group Permission akun Anda.
            </p>
          </div>

          <div
            v-if="notice"
            class="alert alert-sm mb-3 rounded-2"
            :class="notice.type === 'warning' ? 'alert-warning' : 'alert-info'"
            role="alert"
          >
            {{ notice.text }}
          </div>

          <form novalidate @submit.prevent="submit">
            <div
              v-if="errorMessage"
              class="alert alert-danger alert-sm mb-3 rounded-2"
              role="alert"
            >
              {{ errorMessage }}
            </div>

            <div class="mb-3">
              <label class="form-label small fw-semibold text-dark">Email Akun</label>
              <input
                v-model.trim="email"
                class="form-control"
                type="email"
                name="email"
                placeholder="admin@playtopia.id"
                autocomplete="username"
                :disabled="auth.isLoggingIn"
                @input="errorMessage = ''"
              >
            </div>

            <div class="mb-4">
              <label class="form-label small fw-semibold text-dark">Kata Sandi</label>
              <div class="input-group">
                <input
                  v-model="password"
                  class="form-control"
                  :type="showPassword ? 'text' : 'password'"
                  name="password"
                  placeholder="••••••••"
                  autocomplete="current-password"
                  :disabled="auth.isLoggingIn"
                  @input="errorMessage = ''"
                >
                <button
                  type="button"
                  class="btn btn-outline-secondary px-3 small"
                  :disabled="auth.isLoggingIn"
                  @click="showPassword = !showPassword"
                >
                  {{ showPassword ? 'Sembunyikan' : 'Tampilkan' }}
                </button>
              </div>
            </div>

            <button
              type="submit"
              class="btn btn-primary w-100 py-2.5 fw-semibold"
              :disabled="!canSubmit"
            >
              <span
                v-if="auth.isLoggingIn"
                class="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              />
              {{ auth.isLoggingIn ? 'Memvalidasi Sesi...' : 'Masuk' }}
            </button>
          </form>

          <div class="mt-4 pt-3 border-top text-center">
            <a href="/customer-display" target="_blank" class="btn btn-sm btn-outline-secondary px-3">
              Buka Layar Pelanggan (Customer Display)
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
    email: 'admin@playtopia.id',
    password: 'admin123',
    badgeClass: 'badge-play-sky',
    desc: 'Akses penuh 8 Grup Menu: Role Matrix, User, Menu, Katalog, Kasir & Gate'
  },
  {
    role: 'Client',
    title: 'Owner Playtopia',
    email: 'owner@playtopia.id',
    password: 'owner123',
    badgeClass: 'badge-play-amber',
    desc: 'Dashboard Eksekutif, Laporan Penjualan, Approval Closing & Promo'
  },
  {
    role: 'Staff',
    title: 'Kasir Operasional',
    email: 'kasir@playtopia.id',
    password: 'kasir123',
    badgeClass: 'badge-play-mint',
    desc: 'Kasir POS, Monitoring Gate, Member Top-Up & Closing Shift'
  }
]

const emailValid = computed(() => /^\S+@\S+\.\S+$/.test(email.value))
const canSubmit = computed(() => emailValid.value && password.value.length > 0 && !auth.isLoggingIn)

const notice = computed(() => {
  if (route.query.reason === 'expired') {
    return { type: 'warning', text: 'Sesi login Anda telah berakhir. Silakan login kembali.' }
  }
  if (route.query.reason === 'unauthorized') {
    return { type: 'info', text: 'Silakan login terlebih dahulu untuk mengakses sistem.' }
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
  background: #f8fafc;
}

.auth-left-panel {
  background: linear-gradient(145deg, #0284c7 0%, #0369a1 100%);
}

.role-pick-btn {
  background: rgba(255, 255, 255, 0.95);
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
  cursor: pointer;
}

.role-pick-btn:hover:not(:disabled) {
  background: #ffffff;
}

.role-pick-btn.selected {
  background: #ffffff;
  outline: 2px solid #38bdf8;
}
</style>
