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
    const project = rows[0]
    if (project?.product_id) {
      await query(
        `INSERT INTO product_projects (product_id, project_id)
         VALUES ($1, $2)
         ON CONFLICT (product_id, project_id) DO NOTHING`,
        [project.product_id, project.id]
      )
    }
    res.status(201).json(project)
  } catch (e) {
    fail(res, e)
  }
})

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id
    const patch = pick(req.body || {}, FIELDS)
    const { rows: prevRows } = await query('SELECT product_id FROM projects WHERE id = $1', [id])
    if (!prevRows[0]) return res.status(404).json({ error: 'Не найден' })
    const prevProductId = prevRows[0].product_id

    const upd = buildUpdate('projects', id, patch)
    if (!upd) return res.status(400).json({ error: 'Нет данных' })
    const { rows } = await query(upd.text, upd.values)
    if (!rows[0]) return res.status(404).json({ error: 'Не найден' })

    // Синхронизация M2M при смене product_id в форме проекта
    if (Object.prototype.hasOwnProperty.call(patch, 'product_id')) {
      const nextProductId = rows[0].product_id
      if (prevProductId && prevProductId !== nextProductId) {
        await query(
          'DELETE FROM product_projects WHERE project_id = $1 AND product_id = $2',
          [id, prevProductId]
        )
      }
      if (nextProductId) {
        await query(
          `INSERT INTO product_projects (product_id, project_id)
           VALUES ($1, $2)
           ON CONFLICT (product_id, project_id) DO NOTHING`,
          [nextProductId, id]
        )
      }
    }

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
