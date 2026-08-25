const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

/** In-memory flag (cookie is httpOnly — JS cannot read it). */
let sessionActive = false
let onUnauthorized = null

export function setSessionActive(active) {
  sessionActive = Boolean(active)
}

export function hasSession() {
  return sessionActive
}

/** Register handler for 401 (e.g. clear auth store + redirect). */
export function setUnauthorizedHandler(fn) {
  onUnauthorized = typeof fn === 'function' ? fn : null
}

export function clearClientSession() {
  sessionActive = false
  try {
    localStorage.removeItem('robustino_token') // legacy cleanup
  } catch {
    /* ignore */
  }
}

async function parseResponse(res, { skipAuthHandler = false } = {}) {
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) {
    if (res.status === 401 && !skipAuthHandler) {
      clearClientSession()
      onUnauthorized?.(data)
    }
    const msg = data?.error || data?.message || res.statusText || 'Ошибка запроса'
    const err = new Error(msg)
    err.status = res.status
    throw err
  }
  return data
}

export async function apiFetch(path, { method = 'GET', body, headers = {}, formData, skipAuthHandler } = {}) {
  const opts = {
    method,
    headers: { ...headers },
    credentials: 'include',
  }

  if (formData) {
    opts.body = formData
  } else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }

  const res = await fetch(`${API_BASE}${path}`, opts)
  return parseResponse(res, { skipAuthHandler })
}

export { API_BASE }
