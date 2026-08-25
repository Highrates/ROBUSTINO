import { Router } from 'express'
import { query } from '../db.js'
import { optionalAuth, requireAuth } from '../auth.js'
import { fail } from '../errors.js'
import { nextDisplayOrder, updateOrder, pick, buildInsert, buildUpdate } from '../util.js'

const router = Router()
const FIELDS = [
  'name', 'client', 'description', 'images', 'logo_url', 'project_date',
  'seats_count', 'product_id', 'upholstery_variant', 'display_order',
]

router.get('/', optionalAuth, async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT p.*,
        CASE WHEN p.product_id IS NULL THEN NULL
          ELSE json_build_object('id', pr.id, 'name', pr.name, 'slug', pr.slug)
        END AS products
       FROM projects p
       LEFT JOIN products pr ON pr.id = p.product_id
       ORDER BY p.display_order ASC NULLS LAST, p.created_at DESC
       LIMIT 1000`
    )
    res.json(rows)
  } catch (e) {
    fail(res, e)
  }
})

router.put('/order', requireAuth, async (req, res) => {
  try {
    await updateOrder('projects', req.body?.orderUpdates || req.body)
    res.json({ ok: true })
  } catch (e) {
    fail(res, e)
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT p.*,
        CASE WHEN p.product_id IS NULL THEN NULL
          ELSE json_build_object('id', pr.id, 'name', pr.name, 'slug', pr.slug)
        END AS products
       FROM projects p
       LEFT JOIN products pr ON pr.id = p.product_id
       WHERE p.id = $1`,
      [req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ error: 'Не найден' })
    res.json(rows[0])
  } catch (e) {
    fail(res, e)
  }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const data = pick(req.body || {}, FIELDS)
    if (data.display_order == null) data.display_order = await nextDisplayOrder('projects')
    const ins = buildInsert('projects', data)
    const { rows } = await query(ins.text, ins.values)
    res.status(201).json(rows[0])
  } catch (e) {
    fail(res, e)
  }
})

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const upd = buildUpdate('projects', req.params.id, pick(req.body || {}, FIELDS))
    if (!upd) return res.status(400).json({ error: 'Нет данных' })
    const { rows } = await query(upd.text, upd.values)
    if (!rows[0]) return res.status(404).json({ error: 'Не найден' })
    res.json(rows[0])
  } catch (e) {
    fail(res, e)
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await query('DELETE FROM product_projects WHERE project_id = $1', [req.params.id])
    const { rowCount } = await query('DELETE FROM projects WHERE id = $1', [req.params.id])
    if (!rowCount) return res.status(404).json({ error: 'Не найден' })
    res.json({ ok: true })
  } catch (e) {
    fail(res, e)
  }
})

export default router
