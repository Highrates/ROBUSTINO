import { Router } from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { requireAuth } from '../auth.js'
import { fail } from '../errors.js'

const router = Router()

const MEDIA_ROOT = path.resolve(process.env.MEDIA_ROOT || '/var/www/html/media')
const MEDIA_PUBLIC_BASE = (process.env.MEDIA_PUBLIC_BASE || 'https://robustino.ru/media').replace(
  /\/$/,
  ''
)
const ALLOWED_BUCKETS = new Set(['models', 'images', 'articles', 'projects', 'documents'])

/**
 * Resolve a relative path inside bucket and ensure it cannot escape the bucket root.
 * Returns { rel, absolute, dir } where rel uses forward slashes.
 */
function safeMediaPath(bucket, rawPath) {
  if (!ALLOWED_BUCKETS.has(bucket)) {
    throw Object.assign(new Error(`Unknown bucket: ${bucket}`), { status: 400 })
  }
  const relRaw = String(rawPath || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
  if (!relRaw || relRaw.includes('\0')) {
    throw Object.assign(new Error('invalid path'), { status: 400 })
  }
  // Reject explicit traversal segments before resolve
  const parts = relRaw.split('/').filter(Boolean)
  if (parts.some((p) => p === '..')) {
    throw Object.assign(new Error('invalid path'), { status: 400 })
  }

  const bucketRoot = path.resolve(MEDIA_ROOT, bucket)
  const absolute = path.resolve(bucketRoot, ...parts)
  const relPrefix = bucketRoot.endsWith(path.sep) ? bucketRoot : bucketRoot + path.sep
  if (absolute !== bucketRoot && !absolute.startsWith(relPrefix)) {
    throw Object.assign(new Error('invalid path'), { status: 400 })
  }

  const rel = parts.join('/')
  return {
    rel,
    absolute,
    dir: path.dirname(absolute),
    filename: path.basename(absolute),
    bucketRoot,
  }
}

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    try {
      const raw = req.query.path || req.body?.path || ''
      const { dir } = safeMediaPath(req.params.bucket, raw)
      fs.mkdirSync(dir, { recursive: true })
      cb(null, dir)
    } catch (e) {
      cb(e)
    }
  },
  filename(req, file, cb) {
    try {
      const raw = req.query.path || req.body?.path || file.originalname
      const { filename } = safeMediaPath(req.params.bucket, raw)
      cb(null, filename)
    } catch (e) {
      cb(e)
    }
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
})

router.post('/:bucket', requireAuth, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const status = err.status || 400
      return res.status(status).json({ error: err.message || 'Upload failed' })
    }
    next()
  })
}, (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file required' })
    const raw = req.query.path || req.body?.path || req.file.filename
    const { rel } = safeMediaPath(req.params.bucket, raw)
    // Verify written file stayed inside bucket
    const written = path.resolve(req.file.path)
    const { bucketRoot } = safeMediaPath(req.params.bucket, rel)
    const prefix = bucketRoot.endsWith(path.sep) ? bucketRoot : bucketRoot + path.sep
    if (written !== bucketRoot && !written.startsWith(prefix)) {
      try {
        fs.unlinkSync(written)
      } catch {
        /* ignore */
      }
      return res.status(400).json({ error: 'invalid path' })
    }
    const publicUrl = `${MEDIA_PUBLIC_BASE}/${req.params.bucket}/${rel}`
    res.status(201).json({
      path: rel,
      fullPath: `${req.params.bucket}/${rel}`,
      publicUrl,
    })
  } catch (e) {
    fail(res, e)
  }
})

router.delete('/:bucket', requireAuth, (req, res) => {
  try {
    const raw = req.query.path || req.body?.path || ''
    const { absolute } = safeMediaPath(req.params.bucket, raw)
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) {
      fs.unlinkSync(absolute)
    }
    res.json({ ok: true })
  } catch (e) {
    fail(res, e)
  }
})

export default router
