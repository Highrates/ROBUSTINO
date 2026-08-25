import { Router } from 'express'
import { query } from '../db.js'
import { requireAuth } from '../auth.js'
import { fail } from '../errors.js'
import { pick, buildInsert, buildUpdate } from '../util.js'

const router = Router()
const FIELDS = ['name', 'document_url']

router.get('/', async (_req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM presentation ORDER BY created_at DESC LIMIT 1'
    )
    res.json(rows[0] || null)
  } catch (e) {
    fail(res, e)
  }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const data = pick(req.body || {}, FIELDS)
    const existing = await query('SELECT id FROM presentation LIMIT 1')
    if (existing.rows[0]) {
      const upd = buildUpdate('presentation', existing.rows[0].id, data)
      const { rows } = await query(upd.text, upd.values)
      return res.json(rows[0])
    }
    const ins = buildInsert('presentation', data)
    const { rows } = await query(ins.text, ins.values)
    res.status(201).json(rows[0])
  } catch (e) {
    fail(res, e)
  }
})

router.patch('/', requireAuth, async (req, res) => {
  try {
    const data = pick(req.body || {}, FIELDS)
    const existing = await query('SELECT id FROM presentation LIMIT 1')
    if (!existing.rows[0]) {
      const ins = buildInsert('presentation', data)
      const { rows } = await query(ins.text, ins.values)
      return res.status(201).json(rows[0])
    }
    const upd = buildUpdate('presentation', existing.rows[0].id, data)
    const { rows } = await query(upd.text, upd.values)
    res.json(rows[0])
  } catch (e) {
    fail(res, e)
  }
})

export default router
