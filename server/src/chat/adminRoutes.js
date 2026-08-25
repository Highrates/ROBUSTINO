import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { query } from '../db.js'
import { badRequest, fail, notFound } from '../errors.js'
import { SITE_CHAT_ADMIN_UPLOAD_RATE } from '../../../shared/siteChatLimits.js'
import { ADMIN_UPLOAD_MAX_BYTES, uploadAdmin } from './config.js'
import { assertContentLength, getClientIp, hitRateLimit } from './rateLimit.js'
import { parseLimit } from './session.js'
import { insertMessage, listMessages, validateAttachmentRefs } from './service.js'
import { cleanupOrphanChatFiles, multerErrorHandler, saveUploadBuffer } from './storage.js'

const router = Router()

router.get('/unread-count', requireAuth, async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS count
       FROM site_chat_conversations c
       WHERE EXISTS (
         SELECT 1 FROM site_chat_messages m
         WHERE m.conversation_id = c.id
           AND m.author_role = 'CUSTOMER'
           AND m.deleted_at IS NULL
           AND (c.staff_last_read_at IS NULL OR m.created_at > c.staff_last_read_at)
       )`
    )
    res.json({ count: rows[0]?.count || 0 })
  } catch (e) {
    fail(res, e)
  }
})

router.get('/conversations', requireAuth, async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT c.id, c.visitor_label, c.page_url, c.last_message_at, c.created_at, c.staff_last_read_at,
              (
                SELECT m.body FROM site_chat_messages m
                WHERE m.conversation_id = c.id AND m.deleted_at IS NULL
                ORDER BY m.created_at DESC, m.id DESC
                LIMIT 1
              ) AS last_body,
              (
                SELECT COUNT(*)::int FROM site_chat_messages m
                WHERE m.conversation_id = c.id
                  AND m.author_role = 'CUSTOMER'
                  AND m.deleted_at IS NULL
                  AND (c.staff_last_read_at IS NULL OR m.created_at > c.staff_last_read_at)
              ) AS unread_count
       FROM site_chat_conversations c
       WHERE c.last_message_at IS NOT NULL
       ORDER BY c.last_message_at DESC
       LIMIT 200`
    )
    res.json(
      rows.map((r) => ({
        id: r.id,
        visitorLabel: r.visitor_label || 'Посетитель',
        pageUrl: r.page_url || null,
        lastMessageAt: r.last_message_at ? new Date(r.last_message_at).toISOString() : null,
        createdAt: new Date(r.created_at).toISOString(),
        lastBody: r.last_body || '',
        unreadCount: r.unread_count || 0,
      }))
    )
  } catch (e) {
    fail(res, e)
  }
})

router.get('/:id/messages', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, visitor_label FROM site_chat_conversations WHERE id = $1`,
      [req.params.id]
    )
    if (!rows[0]) throw notFound('Диалог не найден')
    const limit = parseLimit(req.query.limit)
    const before = req.query.before || req.query.cursor || null
    const after = req.query.after || null
    const data = await listMessages(rows[0].id, { limit, before, after })
    const guestLabel = rows[0].visitor_label || 'Посетитель'
    data.messages = data.messages.map((m) => ({
      ...m,
      authorLabel: m.authorRole === 'STAFF' ? 'Вы' : guestLabel,
    }))
    res.json(data)
  } catch (e) {
    fail(res, e)
  }
})

router.post('/:id/messages', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(`SELECT id FROM site_chat_conversations WHERE id = $1`, [
      req.params.id,
    ])
    if (!rows[0]) throw notFound('Диалог не найден')
    const attachments = validateAttachmentRefs(req.body?.attachments)
    const message = await insertMessage({
      conversationId: rows[0].id,
      authorRole: 'STAFF',
      body: req.body?.body,
      attachments,
    })
    message.authorLabel = 'Вы'
    res.status(201).json(message)
  } catch (e) {
    fail(res, e)
  }
})

router.post('/:id/read', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await query(
      `UPDATE site_chat_conversations
       SET staff_last_read_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [req.params.id]
    )
    if (!rowCount) throw notFound('Диалог не найден')
    res.json({ ok: true })
  } catch (e) {
    fail(res, e)
  }
})

router.post('/:id/upload', requireAuth, (req, _res, next) => {
  try {
    assertContentLength(req, ADMIN_UPLOAD_MAX_BYTES)
    hitRateLimit(`chat-up-admin:${getClientIp(req)}`, {
      windowMs: SITE_CHAT_ADMIN_UPLOAD_RATE.windowMs,
      max: SITE_CHAT_ADMIN_UPLOAD_RATE.maxPerIp,
      label: 'Слишком много загрузок',
    })
    next()
  } catch (e) {
    fail(_res, e)
  }
}, uploadAdmin.single('file'), async (req, res) => {
  try {
    const { rows } = await query(`SELECT id FROM site_chat_conversations WHERE id = $1`, [
      req.params.id,
    ])
    if (!rows[0]) throw notFound('Диалог не найден')
    if (!req.file) throw badRequest('Файл не передан')
    await cleanupOrphanChatFiles(rows[0].id)
    const uploaded = saveUploadBuffer(rows[0].id, req.file, ADMIN_UPLOAD_MAX_BYTES)
    res.status(201).json(uploaded)
  } catch (e) {
    fail(res, e)
  }
}, multerErrorHandler)

export default router
