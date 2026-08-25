import { query, withClient } from '../db.js'
import { badRequest } from '../errors.js'
import { SITE_CHAT_STAFF_AVATAR_URL } from '../../../shared/siteChatLimits.js'
import { ATTACHMENTS_MAX, BODY_MAX, MEDIA_PUBLIC_BASE } from './config.js'

export function guessKind(mimeType, filename) {
  const mime = (mimeType || '').toLowerCase()
  if (mime.startsWith('image/')) return 'IMAGE'
  const name = (filename || '').toLowerCase()
  if (/\.(jpe?g|png|gif|webp|heic|heif|avif|bmp|svg)$/.test(name)) return 'IMAGE'
  return 'FILE'
}

export function mapAttachment(row) {
  return {
    id: row.id,
    fileUrl: row.file_url,
    filename: row.filename,
    mimeType: row.mime_type,
    kind: row.kind,
  }
}

export function mapMessage(row, attachmentsByMessage) {
  const isStaff = row.author_role === 'STAFF'
  return {
    id: row.id,
    conversationId: row.conversation_id,
    authorUserId: isStaff ? 'staff' : 'guest',
    authorRole: row.author_role,
    authorLabel: isStaff ? 'ROBUSTINO' : 'Вы',
    authorAvatarUrl: isStaff ? SITE_CHAT_STAFF_AVATAR_URL : null,
    body: row.deleted_at ? '' : row.body || '',
    deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    attachments: row.deleted_at ? [] : attachmentsByMessage.get(row.id) || [],
  }
}

export async function loadAttachmentsMap(messageIds) {
  const map = new Map()
  if (!messageIds.length) return map
  const { rows } = await query(
    `SELECT id, message_id, file_url, filename, mime_type, kind
     FROM site_chat_attachments
     WHERE message_id = ANY($1::uuid[])
     ORDER BY id ASC`,
    [messageIds]
  )
  for (const r of rows) {
    const list = map.get(r.message_id) || []
    list.push(mapAttachment(r))
    map.set(r.message_id, list)
  }
  return map
}

export async function listMessages(conversationId, { limit, before, after }) {
  if (before && after) throw badRequest('Укажите только before или after')

  if (after) {
    const { rows: anchorRows } = await query(
      `SELECT created_at, id FROM site_chat_messages WHERE id = $1 AND conversation_id = $2`,
      [after, conversationId]
    )
    const anchor = anchorRows[0]
    if (!anchor) throw badRequest('Некорректный курсор after')
    const { rows } = await query(
      `SELECT id, conversation_id, author_role, body, deleted_at, created_at
       FROM site_chat_messages
       WHERE conversation_id = $1
         AND (created_at, id) > ($2::timestamptz, $3::uuid)
       ORDER BY created_at ASC, id ASC
       LIMIT $4`,
      [conversationId, anchor.created_at, anchor.id, limit]
    )
    const attachments = await loadAttachmentsMap(rows.map((r) => r.id))
    return {
      conversationId,
      messages: rows.map((r) => mapMessage(r, attachments)),
      hasOlder: undefined,
      delta: true,
    }
  }

  const take = limit + 1
  let rows
  if (before) {
    const { rows: anchorRows } = await query(
      `SELECT created_at, id FROM site_chat_messages WHERE id = $1 AND conversation_id = $2`,
      [before, conversationId]
    )
    const anchor = anchorRows[0]
    if (!anchor) throw badRequest('Некорректный курсор before')
    const result = await query(
      `SELECT id, conversation_id, author_role, body, deleted_at, created_at
       FROM site_chat_messages
       WHERE conversation_id = $1
         AND (created_at, id) < ($2::timestamptz, $3::uuid)
       ORDER BY created_at DESC, id DESC
       LIMIT $4`,
      [conversationId, anchor.created_at, anchor.id, take]
    )
    rows = result.rows
  } else {
    const result = await query(
      `SELECT id, conversation_id, author_role, body, deleted_at, created_at
       FROM site_chat_messages
       WHERE conversation_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT $2`,
      [conversationId, take]
    )
    rows = result.rows
  }

  const hasOlder = rows.length > limit
  const page = hasOlder ? rows.slice(0, limit) : rows
  page.reverse()
  const attachments = await loadAttachmentsMap(page.map((r) => r.id))
  return {
    conversationId,
    messages: page.map((r) => mapMessage(r, attachments)),
    hasOlder,
  }
}

export function validateAttachmentRefs(attachments) {
  if (attachments == null) return []
  if (!Array.isArray(attachments)) throw badRequest('attachments должен быть массивом')
  if (attachments.length > ATTACHMENTS_MAX) {
    throw badRequest(`Не более ${ATTACHMENTS_MAX} вложений`)
  }
  const out = []
  for (const a of attachments) {
    const fileUrl = String(a?.fileUrl || '').trim()
    const filename = String(a?.filename || '').trim()
    const mimeType = a?.mimeType != null ? String(a.mimeType) : null
    const kind = a?.kind === 'IMAGE' || a?.kind === 'FILE' ? a.kind : guessKind(mimeType, filename)
    if (!fileUrl || !filename) throw badRequest('Вложение без URL или имени')
    if (!fileUrl.startsWith(`${MEDIA_PUBLIC_BASE}/documents/chat/`)) {
      throw badRequest('Некорректный URL вложения')
    }
    out.push({ fileUrl, filename, mimeType, kind })
  }
  return out
}

export async function insertMessage({ conversationId, authorRole, body, attachments }) {
  const trimmed = String(body || '').trim()
  if (!trimmed && !attachments.length) throw badRequest('Пустое сообщение')
  if (trimmed.length > BODY_MAX) throw badRequest(`Текст не длиннее ${BODY_MAX} символов`)

  return withClient(async (client) => {
    await client.query('BEGIN')
    try {
      const { rows } = await client.query(
        `INSERT INTO site_chat_messages (conversation_id, author_role, body)
         VALUES ($1, $2, $3)
         RETURNING id, conversation_id, author_role, body, deleted_at, created_at`,
        [conversationId, authorRole, trimmed]
      )
      const msg = rows[0]
      for (const a of attachments) {
        await client.query(
          `INSERT INTO site_chat_attachments (message_id, file_url, filename, mime_type, kind)
           VALUES ($1, $2, $3, $4, $5)`,
          [msg.id, a.fileUrl, a.filename, a.mimeType, a.kind]
        )
      }
      await client.query(
        `UPDATE site_chat_conversations
         SET last_message_at = $2, updated_at = NOW()
         WHERE id = $1`,
        [conversationId, msg.created_at]
      )
      await client.query('COMMIT')

      const attachmentsMap = await loadAttachmentsMap([msg.id])
      return mapMessage(msg, attachmentsMap)
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    }
  })
}
