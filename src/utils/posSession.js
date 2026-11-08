import { decodeJwt } from '@/utils/auth'

const TOKEN_KEY = 'pos_token'
const USER_KEY = 'pos_user'
const MENUS_KEY = 'pos_menus'
const PERMS_KEY = 'pos_perms'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export function getStoredMenus() {
  try {
    return JSON.parse(localStorage.getItem(MENUS_KEY) || '[]')
  } catch {
    return []
  }
}

export function getStoredPermissions() {
  try {
    return JSON.parse(localStorage.getItem(PERMS_KEY) || '{}')
  } catch {
    return {}
  }
}

/** Waktu kedaluwarsa token (ms epoch) dari klaim `exp`, atau 0 jika token tidak valid. */
export function getExpiryMs(token = getToken()) {
  const payload = token ? decodeJwt(token) : null
  return payload && typeof payload.exp === 'number' ? payload.exp * 1000 : 0
}

export function isSessionValid() {
  const exp = getExpiryMs()
  return exp > Date.now()
}

export function saveSession(token, user, menuGroups = [], permissions = {}) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  localStorage.setItem(MENUS_KEY, JSON.stringify(menuGroups || []))
  localStorage.setItem(PERMS_KEY, JSON.stringify(permissions || {}))
}

export function updateStoredMenus(menuGroups = [], permissions = {}) {
  localStorage.setItem(MENUS_KEY, JSON.stringify(menuGroups || []))
  localStorage.setItem(PERMS_KEY, JSON.stringify(permissions || {}))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(MENUS_KEY)
  localStorage.removeItem(PERMS_KEY)
}
