/** Ключ календарного дня браузера (для группировки в ленте). */
export function chatLocalDayKey(iso) {
  const parsed = Date.parse(iso)
  if (Number.isNaN(parsed)) return null
  const d = new Date(parsed)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

function startOfLocalDay(ts) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** «Сегодня» / «Вчера» / «Позавчера» или дата. */
export function formatChatDaySeparatorLabel(iso, listLocale = 'ru-RU', now = new Date()) {
  const parsed = Date.parse(iso)
  if (Number.isNaN(parsed)) return ''

  const msgDayStart = startOfLocalDay(parsed)
  const todayStart = startOfLocalDay(now.getTime())
  const diffDays = Math.round((todayStart - msgDayStart) / 86_400_000)

  if (diffDays === 0) return 'Сегодня'
  if (diffDays === 1) return 'Вчера'
  if (diffDays === 2) return 'Позавчера'

  return new Date(parsed).toLocaleDateString(listLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
