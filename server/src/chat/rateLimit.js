import {
  SITE_CHAT_GUEST_MESSAGE_RATE,
  SITE_CHAT_GUEST_UPLOAD_RATE,
} from '../../../shared/siteChatLimits.js'
import { readGuestToken } from './session.js'

/** In-memory sliding windows: key → { count, resetAt } */
const rateBuckets = new Map()

export function getClientIp(req) {
  const xf = req.headers['x-forwarded-for']
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}

export function hitRateLimit(key, { windowMs, max, label }) {
  const now = Date.now()
  let entry = rateBuckets.get(key)
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs }
    rateBuckets.set(key, entry)
  }
  entry.count += 1
  if (entry.count > max) {
    const retrySec = Math.ceil((entry.resetAt - now) / 1000)
    throw Object.assign(
      new Error(`${label}. Повторите через ${retrySec} с.`),
      { status: 429 }
    )
  }
}

/** Occasional prune so the Map does not grow forever */
export function pruneRateBuckets() {
  if (rateBuckets.size < 500) return
  const now = Date.now()
  for (const [k, v] of rateBuckets) {
    if (now >= v.resetAt) rateBuckets.delete(k)
  }
}

export function assertGuestUploadLimits(req) {
  pruneRateBuckets()
  const ip = getClientIp(req)
  const token = readGuestToken(req) || 'anon'
  const r = SITE_CHAT_GUEST_UPLOAD_RATE
  hitRateLimit(`chat-up-ip:${ip}`, {
    windowMs: r.windowMs,
    max: r.maxPerIp,
    label: 'Слишком много загрузок с этого адреса',
  })
  hitRateLimit(`chat-up-tok:${token}`, {
    windowMs: r.windowMs,
    max: r.maxPerToken,
    label: 'Слишком много загрузок в этой сессии',
  })
  hitRateLimit(`chat-up-ip-day:${ip}`, {
    windowMs: r.dayWindowMs,
    max: r.maxPerIpDay,
    label: 'Дневной лимит загрузок исчерпан',
  })
}

export function assertGuestMessageLimits(req) {
  pruneRateBuckets()
  const ip = getClientIp(req)
  const r = SITE_CHAT_GUEST_MESSAGE_RATE
  hitRateLimit(`chat-msg-ip:${ip}`, {
    windowMs: r.windowMs,
    max: r.maxPerIp,
    label: 'Слишком много сообщений',
  })
}

export function assertContentLength(req, maxBytes) {
  const len = Number(req.headers['content-length'])
  // multipart overhead ~1–2 KB; allow small cushion
  if (Number.isFinite(len) && len > maxBytes + 64 * 1024) {
    throw Object.assign(new Error('Файл слишком большой'), { status: 413 })
  }
}
