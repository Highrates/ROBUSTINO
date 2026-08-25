import multer from 'multer'
import path from 'path'
import {
  SITE_CHAT_ADMIN_UPLOAD_MAX_BYTES,
  SITE_CHAT_ALLOWED_EXT,
  SITE_CHAT_ALLOWED_MIME,
  SITE_CHAT_ATTACHMENTS_MAX,
  SITE_CHAT_BODY_MAX_CHARS,
  SITE_CHAT_CONV_QUOTA_BYTES,
  SITE_CHAT_GUEST_UPLOAD_MAX_BYTES,
  SITE_CHAT_MESSAGES_PAGE_DEFAULT,
  SITE_CHAT_MESSAGES_PAGE_MAX,
  SITE_CHAT_ORPHAN_TTL_MS,
} from '../../../shared/siteChatLimits.js'

export const CHAT_COOKIE = process.env.CHAT_COOKIE_NAME || 'robustino_chat'
export const CHAT_COOKIE_MAX_AGE = Number(process.env.CHAT_COOKIE_MAX_AGE_SEC || 365 * 24 * 60 * 60)
export const BODY_MAX = SITE_CHAT_BODY_MAX_CHARS
export const ATTACHMENTS_MAX = SITE_CHAT_ATTACHMENTS_MAX
export const GUEST_UPLOAD_MAX_BYTES = Number(
  process.env.CHAT_GUEST_UPLOAD_MAX_BYTES || SITE_CHAT_GUEST_UPLOAD_MAX_BYTES
)
export const ADMIN_UPLOAD_MAX_BYTES = Number(
  process.env.CHAT_ADMIN_UPLOAD_MAX_BYTES || SITE_CHAT_ADMIN_UPLOAD_MAX_BYTES
)
export const CONV_QUOTA_BYTES = Number(process.env.CHAT_CONV_QUOTA_BYTES || SITE_CHAT_CONV_QUOTA_BYTES)
export const ORPHAN_TTL_MS = Number(process.env.CHAT_ORPHAN_TTL_MS || SITE_CHAT_ORPHAN_TTL_MS)
export const PAGE_DEFAULT = SITE_CHAT_MESSAGES_PAGE_DEFAULT
export const PAGE_MAX = SITE_CHAT_MESSAGES_PAGE_MAX

export const MEDIA_ROOT = path.resolve(process.env.MEDIA_ROOT || '/var/www/html/media')
export const MEDIA_PUBLIC_BASE = (process.env.MEDIA_PUBLIC_BASE || 'https://robustino.ru/media').replace(
  /\/$/,
  ''
)

export const ALLOWED_MIME = new Set(SITE_CHAT_ALLOWED_MIME)
export const ALLOWED_EXT = new Set(SITE_CHAT_ALLOWED_EXT)

export const uploadGuest = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: GUEST_UPLOAD_MAX_BYTES, files: 1 },
})
export const uploadAdmin = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: ADMIN_UPLOAD_MAX_BYTES, files: 1 },
})
