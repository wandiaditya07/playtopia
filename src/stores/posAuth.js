import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import router from '@/router'
import { api } from '@/utils/posApi'
import {
  getUser,
  getStoredMenus,
  getStoredPermissions,
  getExpiryMs,
  saveSession,
  updateStoredMenus,
  clearSession,
  isSessionValid
} from '@/utils/posSession'

export const usePosAuthStore = defineStore('posAuth', () => {
  const user = ref(getUser())
  const menuGroups = ref(getStoredMenus())
  const permissions = ref(getStoredPermissions())
  const expiresAt = ref(getExpiryMs())
  const now = ref(Date.now())
  const isLoggingIn = ref(false)

  let ticker = null
  let expiryTimer = null

  const remainingMs = computed(() => {
    const exp = Number(expiresAt.value) || 0
    return Math.max(0, exp - now.value)
  })
  const remainingSeconds = computed(() => Math.floor(remainingMs.value / 1000))
  const isExpiringSoon = computed(() => remainingMs.value > 0 && remainingMs.value < 5 * 60 * 1000)

  function can(menuCode, action = 'can_read') {
    if (user.value?.role === 'Admin' || Number(user.value?.role_id) === 2) return true
    const rawCode = String(menuCode || '')
    const shortCode = rawCode.includes('.') ? rawCode.split('.').pop() : rawCode
    const perm = permissions.value?.[rawCode] || permissions.value?.[shortCode]
    if (!perm) return false
    const actKey = String(action).startsWith('can_') ? action : `can_${action}`
    return Boolean(perm[actKey] ?? perm[action])
  }

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
    expiryTimer = setTimeout(() => logout('expired'), Math.max(0, expiresAt.value - Date.now()))
  }

  async function refreshMenus() {
    if (!isSessionValid()) return
    try {
      const res = await api('/auth/me')
      if (res.success && res.data) {
        if (res.data.user) user.value = res.data.user
        if (Array.isArray(res.data.menu_groups)) {
          menuGroups.value = res.data.menu_groups
          permissions.value = res.data.permissions || {}
          updateStoredMenus(res.data.menu_groups, res.data.permissions || {})
        }
      }
    } catch (e) {
      console.warn('Refresh menu warn:', e.message)
    }
  }

  async function login(email, password) {
    isLoggingIn.value = true
    try {
      const res = await api('/auth/login', { method: 'POST', body: { email, password }, auth: false })
      const groups = res.data.menu_groups || []
      const perms = res.data.permissions || {}
      saveSession(res.data.token, res.data.user, groups, perms)
      user.value = res.data.user
      menuGroups.value = groups
      permissions.value = perms
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
    menuGroups.value = []
    permissions.value = {}
    expiresAt.value = 0
    router.replace({ name: 'PosLogin', query: reason ? { reason } : {} })
  }

  function restore() {
    if (isSessionValid()) {
      user.value = getUser()
      menuGroups.value = getStoredMenus()
      permissions.value = getStoredPermissions()
      expiresAt.value = getExpiryMs()
      startTimers()
      // Sinkronkan menu & permission dari database MySQL
      refreshMenus()
    } else {
      clearSession()
      user.value = null
      menuGroups.value = []
      permissions.value = {}
      expiresAt.value = 0
    }
  }

  return {
    user,
    menuGroups,
    permissions,
    expiresAt,
    remainingMs,
    remainingSeconds,
    isExpiringSoon,
    isLoggingIn,
    can,
    refreshMenus,
    login,
    logout,
    restore
  }
})
