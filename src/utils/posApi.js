import router from '@/router'
import { getToken, clearSession } from '@/utils/posSession'

const BASE_URL = import.meta.env.VITE_POS_API_URL || 'http://localhost:8080/api/v1'

export class ApiError extends Error {
  constructor(message, { status = 0, code = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

let redirecting = false

function forceLogout(code) {
  clearSession()
  if (redirecting) return
  redirecting = true
  const current = router.currentRoute.value
  router
    .replace({
      name: 'PosLogin',
      query: {
        reason: code === 'TOKEN_EXPIRED' ? 'expired' : 'unauthorized',
        redirect: current.name === 'PosLogin' ? undefined : current.fullPath
      }
    })
    .finally(() => {
      redirecting = false
    })
}

/**
 * Wrapper fetch untuk backend POS.
 * - Menyisipkan `Authorization: Bearer <jwt>`
 * - 401 (token expired / invalid / tidak ada) -> sesi dihapus & redirect ke /login
 * - Selalu melempar ApiError dengan pesan yang siap ditampilkan ke user
 */
export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    })
  } catch {
    throw new ApiError('Server tidak dapat dihubungi. Periksa koneksi / pastikan backend berjalan.')
  }

  let json = null
  try {
    json = await response.json()
  } catch {
    // body kosong / bukan JSON
  }

  if (response.status === 401 && auth) {
    forceLogout(json?.code)
    throw new ApiError(json?.message || 'Sesi berakhir. Silakan login kembali.', { status: 401, code: json?.code })
  }

  if (!response.ok || json?.success === false) {
    throw new ApiError(json?.message || `Permintaan gagal (HTTP ${response.status}).`, {
      status: response.status,
      code: json?.code
    })
  }

  return json
}

