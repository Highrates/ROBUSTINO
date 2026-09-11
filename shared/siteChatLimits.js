/**
 * Shared site-chat limits — imported by Express API and Vite frontend.
 * Keep values in sync; env overrides on the server may raise/lower byte caps only.
 */

export const SITE_CHAT_BODY_MAX_CHARS = 12_000
/** Guest text without attachments must be at least this long */
export const SITE_CHAT_GUEST_BODY_MIN_CHARS = 4
/** Guest display name (required on first message) */
export const SITE_CHAT_VISITOR_LABEL_MIN = 2
export const SITE_CHAT_ATTACHMENTS_MAX = 12
export const SITE_CHAT_VISITOR_LABEL_MAX = 64
export const SITE_CHAT_PAGE_URL_MAX = 2048
/** Empty conversations (upload-only / abandoned) older than this are deleted */
export const SITE_CHAT_EMPTY_CONV_TTL_MS = 24 * 60 * 60 * 1000
/** Public path for STAFF avatar in chat UI */
export const SITE_CHAT_STAFF_AVATAR_URL = '/logo-rob.svg'

export const SITE_CHAT_GUEST_UPLOAD_MAX_BYTES = 8 * 1024 * 1024
export const SITE_CHAT_ADMIN_UPLOAD_MAX_BYTES = 15 * 1024 * 1024
export const SITE_CHAT_CONV_QUOTA_BYTES = 40 * 1024 * 1024
export const SITE_CHAT_ORPHAN_TTL_MS = 60 * 60 * 1000

export const SITE_CHAT_MESSAGES_PAGE_DEFAULT = 50
export const SITE_CHAT_MESSAGES_PAGE_MAX = 100

/** Client poll interval for message deltas */
export const SITE_CHAT_POLL_MS = 3_500
export const SITE_CHAT_ADMIN_UNREAD_POLL_MS = 15_000

export const SITE_CHAT_GUEST_UPLOAD_RATE = {
  windowMs: 15 * 60 * 1000,
  maxPerIp: 10,
  maxPerToken: 10,
  dayWindowMs: 24 * 60 * 60 * 1000,
  maxPerIpDay: 40,
}

export const SITE_CHAT_GUEST_MESSAGE_RATE = {
  windowMs: 15 * 60 * 1000,
  maxPerIp: 40,
}

export const SITE_CHAT_ADMIN_UPLOAD_RATE = {
  windowMs: 15 * 60 * 1000,
  maxPerIp: 60,
}

export const SITE_CHAT_ALLOWED_EXT = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.heic',
  '.heif',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.txt',
]

export const SITE_CHAT_ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/octet-stream',
]

export function formatUploadMaxLabel(bytes) {
  const mb = Math.round(bytes / (1024 * 1024))
  return `Файл слишком большой (макс. ${mb} МБ)`
}

/**
 * Soft heuristic for keyboard-mash / ad-bot junk (guest messages only).
 * Returns true when the text looks unlikely to be a real human message.
 */
export function isLikelyGuestChatSpam(body) {
  const t = String(body || '').trim()
  if (!t) return false

  const letters = t.replace(/[^a-zA-Zа-яА-ЯёЁ]/g, '')
  if (letters.length >= 8) {
    const vowels = (letters.match(/[aeiouyаеёиоуыэюя]/gi) || []).length
    if (vowels / letters.length < 0.15) return true
  }

  if (/[бвгджзйклмнпрстфхцчшщъь]{6,}/i.test(t)) return true
  if (/[bcdfghjklmnpqrstvwxz]{7,}/i.test(t)) return true

  // Long run without spaces that is mostly letters → often mash / scanner noise
  if (letters.length >= 14 && !/\s/.test(t) && letters.length / t.length > 0.85) return true

  return false
}

/** Guest body rules when there are no attachments. */
export function guestBodyTooShort(body, attachmentCount = 0) {
  if (attachmentCount > 0) return false
  return String(body || '').trim().length < SITE_CHAT_GUEST_BODY_MIN_CHARS
}

export function guestVisitorLabelTooShort(label) {
  return String(label || '').trim().length < SITE_CHAT_VISITOR_LABEL_MIN
}
