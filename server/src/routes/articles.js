import { Router } from 'express'
import { query } from '../db.js'
import { optionalAuth, requireAuth, isAdmin } from '../auth.js'
import { fail } from '../errors.js'
import { nextDisplayOrder, updateOrder, pick, buildInsert, buildUpdate } from '../util.js'

const router = Router()
const FIELDS = [
  'title', 'slug', 'content', 'excerpt', 'cover_image', 'category', 'tags',
  'published_at', 'author', 'status', 'views', 'subtitle', 'article_date', 'display_order',
]

router.get('/', optionalAuth, async (req, res) => {
  try {
    const sql = isAdmin(req)
      ? `SELECT * FROM articles ORDER BY display_order ASC NULLS LAST, created_at DESC LIMIT 1000`
      : `SELECT * FROM articles WHERE status = 'published'
         ORDER BY display_order ASC NULLS LAST, created_at DESC LIMIT 1000`
    const { rows } = await query(sql)
    res.json(rows)
  } catch (e) {
    fail(res, e)
  }
})

router.put('/order', requireAuth, async (req, res) => {
  try {
    await updateOrder('articles', req.body?.orderUpdates || req.body)
    res.json({ ok: true })
  } catch (e) {
    fail(res, e)
  }
})

router.get('/slug/:slug', optionalAuth, async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM articles WHERE slug = $1 LIMIT 1', [req.params.slug])
    const row = rows[0]
    if (!row) return res.status(404).json({ error: 'Статья не найдена' })
    if (!isAdmin(req) && row.status !== 'published') {
      return res.status(404).json({ error: 'Статья не опубликована' })
    }
    res.json(row)
  } catch (e) {
    fail(res, e)
  }
})

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM articles WHERE id = $1', [req.params.id])
    const row = rows[0]
    if (!row) return res.status(404).json({ error: 'Не найдена' })
    if (!isAdmin(req) && row.status !== 'published') {
      return res.status(404).json({ error: 'Не опубликована' })
    }
    res.json(row)
  } catch (e) {
    fail(res, e)
  }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const data = pick(req.body || {}, FIELDS)
    if (data.display_order == null) data.display_order = await nextDisplayOrder('articles')
    if (!data.status) data.status = 'draft'
    const ins = buildInsert('articles', data)
    const { rows } = await query(ins.text, ins.values)
    res.status(201).json(rows[0])
  } catch (e) {
    fail(res, e)
  }
})

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const upd = buildUpdate('articles', req.params.id, pick(req.body || {}, FIELDS))
    if (!upd) return res.status(400).json({ error: 'Нет данных' })
    const { rows } = await query(upd.text, upd.values)
    if (!rows[0]) return res.status(404).json({ error: 'Не найдена' })
    res.json(rows[0])
  } catch (e) {
    fail(res, e)
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM articles WHERE id = $1', [req.params.id])
    if (!rowCount) return res.status(404).json({ error: 'Не найдена' })
    res.json({ ok: true })
  } catch (e) {
    fail(res, e)
  }
})

export default router
