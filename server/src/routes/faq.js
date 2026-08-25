import { Router } from 'express'
import { query } from '../db.js'
import { optionalAuth, requireAuth, isAdmin } from '../auth.js'
import { fail } from '../errors.js'
import { nextDisplayOrder, updateOrder, pick, buildInsert, buildUpdate } from '../util.js'

const router = Router()
const FIELDS = ['question', 'answer', 'display_order', 'is_active']

router.get('/', optionalAuth, async (req, res) => {
  try {
    const sql = isAdmin(req)
      ? `SELECT id, question, answer, display_order, is_active, created_at FROM faq
         ORDER BY display_order ASC NULLS LAST LIMIT 1000`
      : `SELECT id, question, answer, display_order, is_active, created_at FROM faq
         WHERE is_active = true ORDER BY display_order ASC NULLS LAST LIMIT 1000`
    const { rows } = await query(sql)
    res.json(rows)
  } catch (e) {
    fail(res, e)
  }
})

router.put('/order', requireAuth, async (req, res) => {
  try {
    await updateOrder('faq', req.body?.orderUpdates || req.body)
    res.json({ ok: true })
  } catch (e) {
    fail(res, e)
  }
})

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM faq WHERE id = $1', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'Не найден' })
    res.json(rows[0])
  } catch (e) {
    fail(res, e)
  }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const data = pick(req.body || {}, FIELDS)
    if (data.display_order == null) data.display_order = await nextDisplayOrder('faq')
    if (data.is_active == null) data.is_active = true
    const ins = buildInsert('faq', data)
    const { rows } = await query(ins.text, ins.values)
    res.status(201).json(rows[0])
  } catch (e) {
    fail(res, e)
  }
})

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const upd = buildUpdate('faq', req.params.id, pick(req.body || {}, FIELDS))
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
    const { rowCount } = await query('DELETE FROM faq WHERE id = $1', [req.params.id])
    if (!rowCount) return res.status(404).json({ error: 'Не найден' })
    res.json({ ok: true })
  } catch (e) {
    fail(res, e)
  }
})

export default router
