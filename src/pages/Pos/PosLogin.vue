<template>
  <div class="auth-page playtopia-auth-page d-flex align-items-center justify-content-center min-vh-100">
    <div class="container py-4">
      <div class="text-center mb-4">
        <img
          :src="PlaytopiaLogo"
          alt="Playtopia Indonesia"
          class="img-fluid"
          style="max-height: 55px;"
        />
        <div class="mt-2 text-muted fw-semibold">
          Sistem Point of Sale &amp; Turnstile Access Control
        </div>
      </div>

      <div class="card shadow-lg border-0 mx-auto" style="max-width: 440px; border-radius: 16px;">
        <div class="card-body p-4 p-sm-5">
          <h4 class="fw-bold text-dark text-center mb-1">Login Kasir &amp; Staff</h4>
          <p class="text-muted small text-center mb-4">
            Masukkan akun terdaftar untuk membuka sesi kasir Playtopia
          </p>

          <div
            v-if="notice"
            class="alert alert-sm mb-3"
            :class="notice.type === 'warning' ? 'alert-warning' : 'alert-info'"
            role="alert"
          >
            {{ notice.text }}
          </div>

          <div
            v-if="isDev"
            class="alert alert-info alert-sm text-center mb-3 py-2 small"
            role="alert"
          >
            <div>Akun Cepat (Development):</div>
            <strong>kasir@playtopia.id / kasir123</strong>
          </div>

          <form
            novalidate
            @submit.prevent="submit"
          >
            <div
              v-if="errorMessage"
              class="alert alert-danger alert-sm mb-3"
              role="alert"
            >
              {{ errorMessage }}
            </div>

            <div class="form-group mb-3">
              <label class="form-label small fw-bold text-muted">Email Petugas:</label>
              <input
                v-model.trim="email"
                class="form-control form-control-lg"
                type="email"
                name="email"
                placeholder="nama@playtopia.id"
                autocomplete="username"
                :disabled="auth.isLoggingIn"
                @input="errorMessage = ''"
              >
            </div>

            <div class="form-group mb-4">
              <label class="form-label small fw-bold text-muted">Kata Sandi:</label>
              <input
                v-model="password"
                class="form-control form-control-lg"
                type="password"
                name="password"
                placeholder="••••••••"
                autocomplete="current-password"
                :disabled="auth.isLoggingIn"
                @input="errorMessage = ''"
              >
            </div>

            <button
              type="submit"
              class="btn btn-play-sky btn-lg w-100 py-3 fw-bold text-white shadow"
              :disabled="!canSubmit"
            >
              <span
                v-if="auth.isLoggingIn"
                class="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              />
              {{ auth.isLoggingIn ? 'Memvalidasi...' : 'Masuk ke POS' }}
            </button>
          </form>
        </div>
      </div>

      <div class="text-center text-muted small mt-4">
        &copy; 2026 PT Playtopia Indonesia. Hak Cipta Dilindungi.
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

const isDev = import.meta.env.DEV
const email = ref('')
const password = ref('')
const errorMessage = ref('')

const emailValid = computed(() => /^\S+@\S+\.\S+$/.test(email.value))
const canSubmit = computed(() => emailValid.value && password.value.length > 0 && !auth.isLoggingIn)

const notice = computed(() => {
  if (route.query.reason === 'expired') {
    return { type: 'warning', text: 'Sesi login Anda telah berakhir (expired). Silakan login kembali.' }
  }
  if (route.query.reason === 'unauthorized') {
    return { type: 'info', text: 'Silakan login untuk melanjutkan ke antarmuka POS.' }
  }
  return null
})

async function submit() {
  if (!canSubmit.value) return
  errorMessage.value = ''
  try {
    await auth.login(email.value, password.value)
    const target = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/app')
      ? route.query.redirect
      : '/app/pos'
    router.replace(target)
  } catch (err) {
    errorMessage.value = err.message
    password.value = ''
  }
}
</script>

<style scoped>
.playtopia-auth-page {
  background: linear-gradient(135deg, #e6f7ff 0%, #fdf2f9 100%);
}
</style>
