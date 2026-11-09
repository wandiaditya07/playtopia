<template>
  <div class="login-page-wrapper">
    <div class="login-card">

      <!-- Left Panel: Animated Abstract Background -->
      <div class="login-left-panel">
        <div class="orb orb-1" />
        <div class="orb orb-2" />
        <div class="orb orb-3" />
        <div class="orb orb-4" />
        <div class="orb orb-5" />
        <div class="left-panel-content">
          <div class="brand-tagline">
            <div class="tagline-title">Playground & Cafe</div>
            <div class="tagline-sub">Integrated POS System</div>
          </div>
        </div>
      </div>

      <!-- Right Panel: Login Form -->
      <div class="login-right-panel">

        <!-- Logo -->
        <div class="login-logo-area">
          <img :src="PlaytopiaLogo" alt="Playtopia Indonesia" class="login-logo" />
        </div>

        <h2 class="login-title">Welcome Back</h2>
        <p class="login-subtitle">Sign in to your account to continue</p>

        <!-- Quick Demo Switcher -->
        <div class="demo-pills-row mb-3">
          <div class="demo-label mb-1">Pilih Akun Demo:</div>
          <div class="d-flex gap-2">
            <button
              v-for="r in demoRoles"
              :key="r.email"
              type="button"
              class="demo-pill-btn"
              :class="{ 'active': email === r.email }"
              @click="selectDemoRole(r)"
            >
              {{ r.title }}
            </button>
          </div>
        </div>

        <!-- Notice (expired / unauthorized) -->
        <div
          v-if="notice"
          class="login-notice"
          :class="notice.type === 'warning' ? 'notice-warning' : 'notice-info'"
        >
          {{ notice.text }}
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="login-notice notice-error">
          {{ errorMessage }}
        </div>

        <form novalidate @submit.prevent="submit">
          <div class="login-input-group">
            <label class="input-label">Email Address</label>
            <input
              v-model.trim="email"
              type="email"
              name="email"
              placeholder="you@playtopia.id"
              autocomplete="username"
              :disabled="auth.isLoggingIn"
              @input="errorMessage = ''"
            />
          </div>

          <div class="login-input-group">
            <label class="input-label">Password</label>
            <div class="input-with-action">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                name="password"
                placeholder="Enter your password"
                autocomplete="current-password"
                :disabled="auth.isLoggingIn"
                @input="errorMessage = ''"
              />
              <button
                type="button"
                class="toggle-password"
                :disabled="auth.isLoggingIn"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? 'Hide' : 'Show' }}
              </button>
            </div>
          </div>

          <div class="forgot-row">
            <a href="#" class="forgot-link" @click.prevent>Forgot password?</a>
          </div>

          <button
            type="submit"
            class="login-btn-continue"
            :disabled="!canSubmit"
          >
            <span v-if="auth.isLoggingIn" class="spinner" />
            {{ auth.isLoggingIn ? 'Signing in...' : 'Continue' }}
          </button>
        </form>

        <!-- Footer Link -->
        <div class="login-footer-link">
          <a href="/customer-display" target="_blank">Open Customer Display</a>
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
    title: 'Administrator',
    email: 'admin@playtopia.id',
    password: 'admin123',
    color: '#6366f1'
  },
  {
    title: 'Owner',
    email: 'owner@playtopia.id',
    password: 'owner123',
    color: '#f59e0b'
  },
  {
    title: 'Kasir',
    email: 'kasir@playtopia.id',
    password: 'kasir123',
    color: '#10b981'
  }
]

const emailValid = computed(() => /^\S+@\S+\.\S+$/.test(email.value))
const canSubmit = computed(() => emailValid.value && password.value.length > 0 && !auth.isLoggingIn)

const notice = computed(() => {
  if (route.query.reason === 'expired') {
    return { type: 'warning', text: 'Your session has expired. Please sign in again.' }
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
/* ===== Page Wrapper ===== */
.login-page-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(135deg, #e0e7ff 0%, #fce7f3 45%, #dbeafe 100%);
}

/* ===== Card ===== */
.login-card {
  display: flex;
  width: 100%;
  max-width: 900px;
  min-height: 580px;
  border-radius: 24px;
  overflow: hidden;
  box-shadow:
    0 24px 80px rgba(99, 102, 241, 0.12),
    0 4px 24px rgba(0, 0, 0, 0.06);
  background: #fff;
}

/* ===== Left Panel ===== */
.login-left-panel {
  flex: 1 1 48%;
  position: relative;
  overflow: hidden;
  background: linear-gradient(150deg, #818cf8 0%, #6366f1 30%, #a78bfa 60%, #c084fc 85%, #e879f9 100%);
  display: flex;
  align-items: flex-end;
  padding: 36px;
}

/* Animated Orbs */
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(0px);
  will-change: transform;
}

/* Orb 1 — large center-bottom */
.orb-1 {
  width: 300px;
  height: 300px;
  bottom: -40px;
  right: -50px;
  background: radial-gradient(circle at 38% 32%,
    rgba(255,255,255,0.55) 0%,
    rgba(196,181,253,0.35) 45%,
    rgba(109,40,217,0.15) 100%
  );
  box-shadow:
    inset -16px -16px 48px rgba(109,40,217,0.18),
    inset 10px 10px 32px rgba(255,255,255,0.28);
  animation: float1 7s ease-in-out infinite;
}

/* Orb 2 — medium top-left */
.orb-2 {
  width: 180px;
  height: 180px;
  top: 8%;
  left: 8%;
  background: radial-gradient(circle at 38% 32%,
    rgba(255,255,255,0.65) 0%,
    rgba(240,171,252,0.35) 50%,
    rgba(192,38,211,0.1) 100%
  );
  box-shadow:
    inset -10px -10px 28px rgba(192,38,211,0.14),
    inset 6px 6px 18px rgba(255,255,255,0.4);
  animation: float2 9s ease-in-out infinite;
}

/* Orb 3 — small top-right */
.orb-3 {
  width: 72px;
  height: 72px;
  top: 12%;
  right: 18%;
  background: radial-gradient(circle at 38% 32%,
    rgba(255,255,255,0.80) 0%,
    rgba(224,204,255,0.5) 60%,
    rgba(139,92,246,0.2) 100%
  );
  box-shadow:
    inset -5px -5px 14px rgba(139,92,246,0.12),
    inset 3px 3px 8px rgba(255,255,255,0.5);
  animation: float3 6s ease-in-out infinite;
}

/* Orb 4 — tiny accent */
.orb-4 {
  width: 32px;
  height: 32px;
  top: 32%;
  right: 10%;
  background: radial-gradient(circle at 38% 32%,
    rgba(255,255,255,0.9) 0%,
    rgba(216,180,254,0.5) 100%
  );
  animation: float4 8s ease-in-out infinite;
}

/* Orb 5 — medium bottom-left accent */
.orb-5 {
  width: 110px;
  height: 110px;
  bottom: 20%;
  left: 15%;
  background: radial-gradient(circle at 38% 32%,
    rgba(255,255,255,0.5) 0%,
    rgba(167,139,250,0.3) 50%,
    rgba(109,40,217,0.1) 100%
  );
  box-shadow:
    inset -7px -7px 20px rgba(109,40,217,0.12),
    inset 4px 4px 12px rgba(255,255,255,0.35);
  animation: float5 10s ease-in-out infinite;
}

/* Float animations — each with unique keyframe so they feel independent */
@keyframes float1 {
  0%, 100% { transform: translateY(0px) scale(1); }
  33%       { transform: translateY(-18px) scale(1.03); }
  66%       { transform: translateY(10px) scale(0.98); }
}
@keyframes float2 {
  0%, 100% { transform: translateY(0px) translateX(0px); }
  40%       { transform: translateY(-22px) translateX(8px); }
  70%       { transform: translateY(12px) translateX(-6px); }
}
@keyframes float3 {
  0%, 100% { transform: translateY(0px) scale(1); }
  50%       { transform: translateY(-14px) scale(1.08); }
}
@keyframes float4 {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-20px); }
}
@keyframes float5 {
  0%, 100% { transform: translateY(0px) translateX(0px); }
  30%       { transform: translateY(-10px) translateX(12px); }
  60%       { transform: translateY(16px) translateX(-8px); }
}

/* Left panel bottom text */
.left-panel-content {
  position: relative;
  z-index: 2;
}

.brand-tagline {
  color: rgba(255,255,255,0.9);
}

.tagline-title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.3px;
  line-height: 1.2;
}

.tagline-sub {
  font-size: 13px;
  font-weight: 400;
  opacity: 0.75;
  margin-top: 4px;
}

/* ===== Right Panel ===== */
.login-right-panel {
  flex: 1 1 52%;
  padding: 44px 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: #fff;
}

/* Logo */
.login-logo-area {
  margin-bottom: 24px;
}

.login-logo {
  max-height: 42px;
  object-fit: contain;
}

/* Title */
.login-title {
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px 0;
  letter-spacing: -0.4px;
}

.login-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 16px 0;
}

.demo-pills-row {
  margin-bottom: 20px;
}

.demo-label {
  font-size: 11.5px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.demo-pill-btn {
  flex: 1;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.demo-pill-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #0f172a;
}

.demo-pill-btn.active {
  background: #0284c7;
  border-color: #0284c7;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(2, 132, 199, 0.25);
}

/* Notices */
.login-notice {
  font-size: 13px;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 16px;
  line-height: 1.4;
}

.notice-warning {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

.notice-info {
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #bfdbfe;
}

.notice-error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

/* Input Label */
.input-label {
  display: block;
  font-size: 12.5px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
  letter-spacing: 0.1px;
}

/* Input Group */
.login-input-group {
  margin-bottom: 14px;
}

.login-input-group input {
  width: 100%;
  padding: 12px 14px;
  font-size: 14px;
  color: #0f172a;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background: #fff;
  box-sizing: border-box;
}

.login-input-group input::placeholder {
  color: #cbd5e1;
}

.login-input-group input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.login-input-group input:disabled {
  background: #f8fafc;
  color: #94a3b8;
}

/* Input with action button */
.input-with-action {
  position: relative;
}

.input-with-action input {
  padding-right: 56px;
}

.toggle-password {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: #6366f1;
  padding: 4px 6px;
  line-height: 1;
  letter-spacing: 0.2px;
  transition: color 0.15s;
}

.toggle-password:hover {
  color: #4f46e5;
}

.toggle-password:disabled {
  color: #94a3b8;
  cursor: not-allowed;
}

/* Forgot */
.forgot-row {
  text-align: right;
  margin-bottom: 20px;
}

.forgot-link {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  text-decoration: none;
  transition: color 0.15s;
}

.forgot-link:hover {
  color: #6366f1;
}

/* Continue Button */
.login-btn-continue {
  width: 100%;
  padding: 13px;
  background: #6366f1;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.1s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.login-btn-continue:hover:not(:disabled) {
  background: #4f46e5;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
}

.login-btn-continue:active:not(:disabled) {
  transform: scale(0.985);
}

.login-btn-continue:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Spinner */
.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.65s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Divider */
.login-divider {
  display: flex;
  align-items: center;
  margin: 20px 0;
  gap: 12px;
}

.login-divider::before,
.login-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e2e8f0;
}

.login-divider span {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
  white-space: nowrap;
}

/* Demo Role Buttons */
.demo-roles-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.demo-role-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px 16px;
  background: #fff;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
  transition: all 0.18s ease;
  text-align: left;
}

.demo-role-btn:hover:not(:disabled) {
  border-color: #c7d2fe;
  background: #f8f7ff;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.07);
}

.demo-role-btn.selected {
  border-color: #6366f1;
  background: #eef2ff;
  box-shadow: 0 2px 10px rgba(99, 102, 241, 0.12);
  color: #3730a3;
  font-weight: 600;
}

.demo-role-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Role dot indicator */
.role-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
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
