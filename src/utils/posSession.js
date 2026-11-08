import { decodeJwt } from '@/utils/auth'

const TOKEN_KEY = 'pos_token'
const USER_KEY = 'pos_user'

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

/** Waktu kedaluwarsa token (ms epoch) dari klaim `exp`, atau 0 jika token tidak valid. */
export function getExpiryMs(token = getToken()) {
  const payload = token ? decodeJwt(token) : null
  return payload && typeof payload.exp === 'number' ? payload.exp * 1000 : 0
}

export function isSessionValid() {
  const exp = getExpiryMs()
  return exp > Date.now()
}

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

