/** Safe API error responses — never leak DB/internal details to clients. */

export function fail(res, err, fallback = 'Внутренняя ошибка сервера') {
  const status = Number(err?.status) || 500
  if (status >= 500) {
    console.error('[api]', err)
    return res.status(500).json({ error: fallback })
  }
  // Intentional 4xx with controlled message
  return res.status(status).json({ error: err?.message || 'Ошибка запроса' })
}

export function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 })
}

export function notFound(message = 'Не найдено') {
  return Object.assign(new Error(message), { status: 404 })
}
