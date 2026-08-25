import { Router } from 'express'
import { query } from '../db.js'
import { requireAuth } from '../auth.js'
import { fail } from '../errors.js'
import { nextDisplayOrder, pick, buildInsert, buildUpdate } from '../util.js'

const router = Router()

const VARIANT_FIELDS = ['name', 'color', 'image_url', 'collection_id']
const COLLECTION_FIELDS = ['name', 'description', 'display_order']

router.get('/variants', async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT v.*,
        CASE WHEN v.collection_id IS NULL THEN NULL
          ELSE json_build_object('id', c.id, 'name', c.name, 'description', c.description, 'display_order', c.display_order)
        END AS upholstery_collections
       FROM upholstery_variants v
       LEFT JOIN upholstery_collections c ON c.id = v.collection_id
       ORDER BY v.created_at DESC`
    )
    res.json(rows)
  } catch (e) {
    fail(res, e)
  }
})

router.get('/variants/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM upholstery_variants WHERE id = $1', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Не найден' })
    res.json(rows[0])
  } catch (e) {
    fail(res, e)
  }
})

router.post('/variants', requireAuth, async (req, res) => {
  try {
    const ins = buildInsert('upholstery_variants', pick(req.body || {}, VARIANT_FIELDS))
    const { rows } = await query(ins.text, ins.values)
    res.status(201).json(rows[0])
  } catch (e) {
    fail(res, e)
  }
})

router.patch('/variants/:id', requireAuth, async (req, res) => {
  try {
    const upd = buildUpdate('upholstery_variants', req.params.id, pick(req.body || {}, VARIANT_FIELDS))
    if (!upd) return res.status(400).json({ error: 'Нет данных' })
    const { rows } = await query(upd.text, upd.values)
    if (!rows[0]) return res.status(404).json({ error: 'Не найден' })
    res.json(rows[0])
  } catch (e) {
    fail(res, e)
  }
})

router.delete('/variants/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await query('DELETE FROM upholstery_variants WHERE id = $1', [req.params.id])
    if (!rowCount) return res.status(404).json({ error: 'Не найден' })
    res.json({ ok: true })
  } catch (e) {
    fail(res, e)
  }
})

router.get('/collections', async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT * FROM upholstery_collections ORDER BY display_order ASC NULLS LAST, name ASC`
    )
    res.json(rows)
  } catch (e) {
    fail(res, e)
  }
})

router.get('/collections/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM upholstery_collections WHERE id = $1', [
      req.params.id,
    ])
    if (!rows[0]) return res.status(404).json({ error: 'Не найдена' })
    res.json(rows[0])
  } catch (e) {
    fail(res, e)
  }
})

router.post('/collections', requireAuth, async (req, res) => {
  try {
    const data = pick(req.body || {}, COLLECTION_FIELDS)
    if (data.display_order == null) data.display_order = await nextDisplayOrder('upholstery_collections')
    const ins = buildInsert('upholstery_collections', data)
    const { rows } = await query(ins.text, ins.values)
    res.status(201).json(rows[0])
  } catch (e) {
    fail(res, e)
  }
})

router.post('/collections/get-or-create', requireAuth, async (req, res) => {
  try {
    const name = (req.body?.name || '').trim()
    if (!name) return res.status(400).json({ error: 'name required' })
    const existing = await query('SELECT * FROM upholstery_collections WHERE name = $1 LIMIT 1', [
      name,
    ])
    if (existing.rows[0]) return res.json(existing.rows[0])
    const data = {
      name,
      description: req.body?.description || null,
      display_order: await nextDisplayOrder('upholstery_collections'),
    }
    const ins = buildInsert('upholstery_collections', data)
    const { rows } = await query(ins.text, ins.values)
    res.status(201).json(rows[0])
  } catch (e) {
    fail(res, e)
  }
})

router.patch('/collections/:id', requireAuth, async (req, res) => {
  try {
    const upd = buildUpdate(
      'upholstery_collections',
      req.params.id,
      pick(req.body || {}, COLLECTION_FIELDS)
    )
    if (!upd) return res.status(400).json({ error: 'Нет данных' })
    const { rows } = await query(upd.text, upd.values)
    if (!rows[0]) return res.status(404).json({ error: 'Не найдена' })
    res.json(rows[0])
  } catch (e) {
    fail(res, e)
  }
})

router.delete('/collections/:id', requireAuth, async (req, res) => {
  try {
    await query('UPDATE upholstery_variants SET collection_id = NULL WHERE collection_id = $1', [
      req.params.id,
    ])
    const { rowCount } = await query('DELETE FROM upholstery_collections WHERE id = $1', [
      req.params.id,
    ])
    if (!rowCount) return res.status(404).json({ error: 'Не найдена' })
    res.json({ ok: true })
  } catch (e) {
    fail(res, e)
  }
})

router.get('/colors', async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT DISTINCT color FROM upholstery_variants WHERE color IS NOT NULL AND color <> '' ORDER BY color`
    )
    res.json(rows.map((r) => r.color))
  } catch (e) {
    fail(res, e)
  }
})

export default router
