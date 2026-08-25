import crypto from 'crypto'
import { parseCookies } from '../auth.js'
import { query } from '../db.js'
import {
  SITE_CHAT_PAGE_URL_MAX,
  SITE_CHAT_VISITOR_LABEL_MAX,
} from '../../../shared/siteChatLimits.js'
import { CHAT_COOKIE, CHAT_COOKIE_MAX_AGE, PAGE_DEFAULT, PAGE_MAX } from './config.js'

export function cookieSecure() {
  return process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production'
}

export function appendSetCookie(res, cookieLine) {
  const prev = res.getHeader('Set-Cookie')
  if (!prev) {
    res.setHeader('Set-Cookie', cookieLine)
  } else if (Array.isArray(prev)) {
    res.setHeader('Set-Cookie', [...prev, cookieLine])
  } else {
    res.setHeader('Set-Cookie', [prev, cookieLine])
  }
}

export function setChatCookie(res, token) {
  const parts = [
    `${CHAT_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${CHAT_COOKIE_MAX_AGE}`,
  ]
  if (cookieSecure()) parts.push('Secure')
  appendSetCookie(res, parts.join('; '))
}

export function readGuestToken(req) {
  const cookies = parseCookies(req)
  const raw = cookies[CHAT_COOKIE]
  if (!raw || typeof raw !== 'string') return null
  const t = raw.trim()
  if (!/^[0-9a-f-]{36}$/i.test(t)) return null
  return t
}

export function parseLimit(raw) {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) return PAGE_DEFAULT
  return Math.min(Math.floor(n), PAGE_MAX)
}

/** Lookup only — never creates a conversation row. */
export async function findGuestConversation(req) {
  const token = readGuestToken(req)
  if (!token) return { conversation: null, token: null }
  const { rows } = await query(
    `SELECT id, guest_token, visitor_label, page_url, guest_last_read_at, staff_last_read_at, last_message_at
     FROM site_chat_conversations WHERE guest_token = $1`,
    [token]
  )
  return { conversation: rows[0] || null, token }
}

/** Create guest cookie + conversation on first write (message / upload). */
export async function ensureGuestConversation(req, res) {
  let token = readGuestToken(req)
  if (!token) {
    token = crypto.randomUUID()
    setChatCookie(res, token)
  }

  const { rows } = await query(
    `SELECT id, guest_token, visitor_label, page_url, guest_last_read_at, staff_last_read_at, last_message_at
     FROM site_chat_conversations WHERE guest_token = $1`,
    [token]
  )
  if (rows[0]) return { conversation: rows[0], token, created: false }

  const inserted = await query(
    `INSERT INTO site_chat_conversations (guest_token)
     VALUES ($1)
     RETURNING id, guest_token, visitor_label, page_url, guest_last_read_at, staff_last_read_at, last_message_at`,
    [token]
  )
  return { conversation: inserted.rows[0], token, created: true }
}

export function sanitizeVisitorLabel(raw) {
  const s = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SITE_CHAT_VISITOR_LABEL_MAX)
  return s || null
}

export function sanitizePageUrl(raw) {
  const s = String(raw || '').trim().slice(0, SITE_CHAT_PAGE_URL_MAX)
  if (!s) return null
  try {
    const u = new URL(s)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.toString().slice(0, SITE_CHAT_PAGE_URL_MAX)
  } catch {
    return null
  }
}

export async function maybeSetVisitorLabel(conversation, { visitorLabel, body }) {
  if (conversation.visitor_label) return
  const fromName = sanitizeVisitorLabel(visitorLabel)
  const fromBody = sanitizeVisitorLabel(String(body || '').trim().slice(0, SITE_CHAT_VISITOR_LABEL_MAX))
  const label = fromName || fromBody
  if (!label) return
  await query(
    `UPDATE site_chat_conversations
     SET visitor_label = $2, updated_at = NOW()
     WHERE id = $1 AND (visitor_label IS NULL OR visitor_label = '')`,
    [conversation.id, label]
  )
  conversation.visitor_label = label
}

export async function maybeSetPageUrl(conversation, pageUrl) {
  if (conversation.page_url) return
  const url = sanitizePageUrl(pageUrl)
  if (!url) return
  await query(
    `UPDATE site_chat_conversations
     SET page_url = $2, updated_at = NOW()
     WHERE id = $1 AND (page_url IS NULL OR page_url = '')`,
    [conversation.id, url]
  )
  conversation.page_url = url
}
