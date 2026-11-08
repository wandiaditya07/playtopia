const rupiahFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })

/** 50000 -> "Rp 50.000" (aman untuk string/null/NaN) */
export function rupiah(value) {
  const n = Number(value)
  return `Rp ${rupiahFormatter.format(Number.isFinite(n) ? n : 0)}`
}

/** ISO string / Date -> "16.45" (zona waktu lokal browser) */
export function fmtTime(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

export function fmtTimeSeconds(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function fmtDateTime(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

/** Milidetik -> "07:59:12" untuk countdown sesi (aman dari NaN) */
export function fmtCountdown(ms) {
  const num = Number(ms)
  if (!Number.isFinite(num) || num <= 0) return '00:00:00'
  const total = Math.max(0, Math.floor(num / 1000))
  const h = String(Math.floor(total / 3600)).padStart(2, '0')
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}
