import { Router } from 'express'
import { query, withClient } from '../db.js'
import { requireAuth } from '../auth.js'
import { fail } from '../errors.js'

const router = Router()

router.get('/:productId', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT p.*
       FROM product_projects pp
       JOIN projects p ON p.id = pp.project_id
       WHERE pp.product_id = $1
       ORDER BY p.display_order ASC NULLS LAST`,
      [req.params.productId]
    )
    res.json(rows)
  } catch (e) {
    fail(res, e)
  }
})

router.put('/:productId', requireAuth, async (req, res) => {
  try {
    const productId = req.params.productId
    const projectIds = Array.isArray(req.body?.projectIds) ? req.body.projectIds : []

    await withClient(async (client) => {
      await client.query('BEGIN')
      try {
        await client.query('DELETE FROM product_projects WHERE product_id = $1', [productId])
        for (const projectId of projectIds) {
          await client.query(
            'INSERT INTO product_projects (product_id, project_id) VALUES ($1, $2)',
            [productId, projectId]
          )
        }
        await client.query('COMMIT')
      } catch (e) {
        await client.query('ROLLBACK')
        throw e
      }
    })

    res.json({ ok: true })
  } catch (e) {
    fail(res, e)
  }
})

export default router
