import { Router } from 'express'
import {
  guestBodyTooShort,
  guestVisitorLabelTooShort,
  isLikelyGuestChatSpam,
} from '../../../shared/siteChatLimits.js'
import { query } from '../db.js'
import { badRequest, fail } from '../errors.js'
import { GUEST_UPLOAD_MAX_BYTES, uploadGuest } from './config.js'
import {
  assertContentLength,
  assertGuestMessageLimits,
  assertGuestUploadLimits,
} from './rateLimit.js'
import {
  ensureGuestConversation,
  findGuestConversation,
  maybeSetPageUrl,
  maybeSetVisitorLabel,
  parseLimit,
  readGuestToken,
  sanitizeVisitorLabel,
} from './session.js'
import { insertMessage, listMessages, validateAttachmentRefs } from './service.js'
import {
  cleanupOrphanChatFiles,
  gcEmptyConversations,
  multerErrorHandler,
  saveUploadBuffer,
} from './storage.js'
import { notifyStaffTelegram } from './telegramNotify.js'

const router = Router()

const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'https://robustino.ru')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

function originAllowed(value) {
  if (!value || typeof value !== 'string') return false
  try {
    const u = new URL(value)
    const origin = `${u.protocol}//${u.host}`
    return ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes(value)
  } catch {
    return ALLOWED_ORIGINS.includes(value)
  }
}

/** Block curl/scanners that omit browser Origin/Referer. */
function assertGuestBrowserClient(req) {
  const origin = req.headers.origin
  const referer = req.headers.referer
  if (origin) {
    if (!originAllowed(origin)) throw badRequest('Запрос отклонён')
    return
  }
  if (referer && originAllowed(referer)) return
  throw badRequest('Запрос отклонён')
}

let lastGcAt = 0
function maybeGcEmpty() {
  const now = Date.now()
  if (now - lastGcAt < 15 * 60 * 1000) return
  lastGcAt = now
  void gcEmptyConversations().catch(() => undefined)
}

router.get('/messages', async (req, res) => {
  try {
    const { conversation } = await findGuestConversation(req)
    if (!conversation) {
      return res.json({ conversationId: null, messages: [], hasOlder: false })
    }
    const limit = parseLimit(req.query.limit)
    const before = req.query.before || req.query.cursor || null
    const after = req.query.after || null
    const data = await listMessages(conversation.id, { limit, before, after })
    res.json(data)
  } catch (e) {
    fail(res, e)
  }
})

router.post('/messages', async (req, res) => {
  try {
    assertGuestBrowserClient(req)
    assertGuestMessageLimits(req)
    // Honeypot: real UI never sends these
    if (req.body?.website || req.body?.companyUrl || req.body?.hp_field) {
      throw badRequest('Запрос отклонён')
    }
    maybeGcEmpty()
    const { conversation } = await ensureGuestConversation(req, res)
    const attachments = validateAttachmentRefs(req.body?.attachments)
    const body = String(req.body?.body || '')
    const rawLabel = req.body?.visitorLabel ?? req.body?.visitorName
    const label = sanitizeVisitorLabel(rawLabel)

    if (!conversation.visitor_label) {
      if (guestVisitorLabelTooShort(label)) {
        throw badRequest('Укажите, как к вам обращаться (имя или компания)')
      }
    }

    if (guestBodyTooShort(body, attachments.length)) {
      throw badRequest('Напишите сообщение чуть подробнее')
    }
    if (body.trim() && isLikelyGuestChatSpam(body)) {
      throw badRequest('Сообщение выглядит как случайный набор символов. Переформулируйте, пожалуйста')
    }

    await maybeSetVisitorLabel(conversation, { visitorLabel: label })
    await maybeSetPageUrl(conversation, req.body?.pageUrl)
    const message = await insertMessage({
      conversationId: conversation.id,
      authorRole: 'CUSTOMER',
      body,
      attachments,
    })
    void cleanupOrphanChatFiles(conversation.id).catch(() => undefined)
    notifyStaffTelegram({
      conversationId: conversation.id,
      visitorLabel: conversation.visitor_label,
      body: message.body,
      pageUrl: conversation.page_url || null,
      attachmentCount: attachments.length,
    })
    res.status(201).json(message)
  } catch (e) {
    fail(res, e)
  }
})

router.post('/read', async (req, res) => {
  try {
    const { conversation } = await findGuestConversation(req)
    if (!conversation) return res.json({ ok: true })
    await query(
      `UPDATE site_chat_conversations
       SET guest_last_read_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [conversation.id]
    )
    res.json({ ok: true })
  } catch (e) {
    fail(res, e)
  }
})

router.get('/unread-count', async (req, res) => {
  try {
    const token = readGuestToken(req)
    if (!token) return res.json({ count: 0 })
    const { rows } = await query(
      `SELECT c.guest_last_read_at,
              (
                SELECT COUNT(*)::int FROM site_chat_messages m
                WHERE m.conversation_id = c.id
                  AND m.author_role = 'STAFF'
                  AND m.deleted_at IS NULL
                  AND (c.guest_last_read_at IS NULL OR m.created_at > c.guest_last_read_at)
              ) AS count
       FROM site_chat_conversations c
       WHERE c.guest_token = $1`,
      [token]
    )
    res.json({ count: rows[0]?.count || 0 })
  } catch (e) {
    fail(res, e)
  }
})

router.post(
  '/upload',
  (req, _res, next) => {
    try {
      assertGuestBrowserClient(req)
      assertGuestUploadLimits(req)
      assertContentLength(req, GUEST_UPLOAD_MAX_BYTES)
      next()
    } catch (e) {
      fail(_res, e)
    }
  },
  uploadGuest.single('file'),
  async (req, res) => {
    try {
      maybeGcEmpty()
      const { conversation } = await ensureGuestConversation(req, res)
      if (!req.file) throw badRequest('Файл не передан')
      await cleanupOrphanChatFiles(conversation.id)
      const uploaded = saveUploadBuffer(conversation.id, req.file, GUEST_UPLOAD_MAX_BYTES)
      res.status(201).json(uploaded)
    } catch (e) {
      fail(res, e)
    }
  },
  multerErrorHandler
)

export default router
