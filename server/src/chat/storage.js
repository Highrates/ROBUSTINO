import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import multer from 'multer'
import { query } from '../db.js'
import { badRequest, fail } from '../errors.js'
import {
  ALLOWED_EXT,
  ALLOWED_MIME,
  CONV_QUOTA_BYTES,
  MEDIA_PUBLIC_BASE,
  MEDIA_ROOT,
  ORPHAN_TTL_MS,
} from './config.js'
import { guessKind } from './service.js'

export function conversationDir(conversationId) {
  return path.resolve(MEDIA_ROOT, 'documents', 'chat', conversationId)
}

export function assertSafeUnderMedia(absPath) {
  const rootPrefix = MEDIA_ROOT.endsWith(path.sep) ? MEDIA_ROOT : MEDIA_ROOT + path.sep
  if (absPath !== MEDIA_ROOT && !absPath.startsWith(rootPrefix)) {
    throw badRequest('invalid path')
  }
}

export function dirTotalBytes(absDir) {
  if (!fs.existsSync(absDir)) return 0
  let total = 0
  for (const name of fs.readdirSync(absDir)) {
    try {
      const st = fs.statSync(path.join(absDir, name))
      if (st.isFile()) total += st.size
    } catch {
      /* ignore */
    }
  }
  return total
}

export async function cleanupOrphanChatFiles(conversationId) {
  const absDir = conversationDir(conversationId)
  assertSafeUnderMedia(absDir)
  if (!fs.existsSync(absDir)) return

  const { rows } = await query(
    `SELECT a.file_url
     FROM site_chat_attachments a
     JOIN site_chat_messages m ON m.id = a.message_id
     WHERE m.conversation_id = $1`,
    [conversationId]
  )
  const keep = new Set(
    rows.map((r) => {
      const parts = String(r.file_url || '').split('/')
      return parts[parts.length - 1]
    }).filter(Boolean)
  )

  const now = Date.now()
  for (const name of fs.readdirSync(absDir)) {
    if (keep.has(name)) continue
    const abs = path.join(absDir, name)
    try {
      const st = fs.statSync(abs)
      if (!st.isFile()) continue
      if (now - st.mtimeMs >= ORPHAN_TTL_MS) fs.unlinkSync(abs)
    } catch {
      /* ignore */
    }
  }
}

/** Remove conversation media directory entirely (best-effort). */
export function removeConversationDir(conversationId) {
  const absDir = conversationDir(conversationId)
  try {
    assertSafeUnderMedia(absDir)
  } catch {
    return
  }
  if (!fs.existsSync(absDir)) return
  try {
    fs.rmSync(absDir, { recursive: true, force: true })
  } catch {
    /* ignore */
  }
}

/**
 * Delete abandoned conversations with no messages (e.g. upload-only).
 * Returns number of deleted rows.
 */
export async function gcEmptyConversations(ttlMs = Number(process.env.CHAT_EMPTY_CONV_TTL_MS) || 24 * 60 * 60 * 1000) {
  const { rows } = await query(
    `DELETE FROM site_chat_conversations
     WHERE last_message_at IS NULL
       AND created_at < NOW() - ($1::bigint * INTERVAL '1 millisecond')
     RETURNING id`,
    [ttlMs]
  )
  for (const r of rows) {
    removeConversationDir(r.id)
  }
  return rows.length
}

export function assertFileAllowed(file) {
  const ext = path.extname(file.originalname || '').toLowerCase()
  if (!ALLOWED_EXT.has(ext)) {
    throw badRequest('Тип файла не поддерживается')
  }
  const mime = (file.mimetype || '').toLowerCase()
  if (mime && !ALLOWED_MIME.has(mime)) {
    // allow empty/unknown only when extension is ok
    if (mime !== 'application/octet-stream') {
      throw badRequest('MIME-тип файла не поддерживается')
    }
  }
}

export function saveUploadBuffer(conversationId, file, maxBytes) {
  assertFileAllowed(file)
  if (file.size > maxBytes) {
    throw Object.assign(new Error('Файл слишком большой'), { status: 413 })
  }

  const absDir = conversationDir(conversationId)
  assertSafeUnderMedia(absDir)
  const used = dirTotalBytes(absDir)
  if (used + file.size > CONV_QUOTA_BYTES) {
    throw Object.assign(
      new Error('Лимит вложений для этого чата исчерпан'),
      { status: 429 }
    )
  }

  const kind = guessKind(file.mimetype, file.originalname)
  const ext = path.extname(file.originalname || '').toLowerCase().slice(0, 16)
  const safeExt = ALLOWED_EXT.has(ext) ? ext : ''
  const name = `${crypto.randomBytes(16).toString('hex')}${safeExt}`
  const absFile = path.join(absDir, name)
  assertSafeUnderMedia(absFile)
  fs.mkdirSync(absDir, { recursive: true })
  fs.writeFileSync(absFile, file.buffer)
  const url = `${MEDIA_PUBLIC_BASE}/documents/chat/${conversationId}/${name}`
  return {
    url,
    filename: file.originalname || name,
    mimeType: file.mimetype || 'application/octet-stream',
    kind,
  }
}

export function multerErrorHandler(err, _req, res, next) {
  if (!err) return next()
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Файл слишком большой' })
    }
    return res.status(400).json({ error: 'Ошибка загрузки файла' })
  }
  return fail(res, err)
}
