/**
 * Shared site-chat limits — imported by Express API and Vite frontend.
 * Keep values in sync; env overrides on the server may raise/lower byte caps only.
 */

export const SITE_CHAT_BODY_MAX_CHARS = 12_000
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
