import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import router from '@/router'
import { api } from '@/utils/posApi'
import { getUser, getExpiryMs, saveSession, clearSession, isSessionValid } from '@/utils/posSession'

export const usePosAuthStore = defineStore('posAuth', () => {
  const user = ref(getUser())
  const expiresAt = ref(getExpiryMs())
  const now = ref(Date.now())
  const isLoggingIn = ref(false)

  let ticker = null
  let expiryTimer = null

  const remainingMs = computed(() => Math.max(0, expiresAt.value - now.value))
  const isExpiringSoon = computed(() => remainingMs.value > 0 && remainingMs.value < 5 * 60 * 1000)

  function stopTimers() {
    clearInterval(ticker)
    clearTimeout(expiryTimer)
    ticker = null
    expiryTimer = null
  }

  function startTimers() {
    stopTimers()
    if (!expiresAt.value) return
    now.value = Date.now()
    ticker = setInterval(() => { now.value = Date.now() }, 1000)
    // Auto-logout tepat saat token kedaluwarsa (tanpa menunggu request berikutnya)
    expiryTimer = setTimeout(() => logout('expired'), Math.max(0, expiresAt.value - Date.now()))
  }

  async function login(email, password) {
    isLoggingIn.value = true
    try {
      const res = await api('/auth/login', { method: 'POST', body: { email, password }, auth: false })
      saveSession(res.data.token, res.data.user)
      user.value = res.data.user
      expiresAt.value = getExpiryMs(res.data.token)
      startTimers()
      return res.data
    } finally {
      isLoggingIn.value = false
    }
  }

  function logout(reason) {
    stopTimers()
    clearSession()
    user.value = null
    expiresAt.value = 0
    router.replace({ name: 'PosLogin', query: reason ? { reason } : {} })
  }

  // Dipanggil saat app dimuat ulang dengan token masih tersimpan
  function restore() {
    if (isSessionValid()) {
      user.value = getUser()
      expiresAt.value = getExpiryMs()
      startTimers()
    } else {
      clearSession()
      user.value = null
      expiresAt.value = 0
    }
  }

  return { user, expiresAt, remainingMs, isExpiringSoon, isLoggingIn, login, logout, restore }
})

