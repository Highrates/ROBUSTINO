import { Router } from 'express'
import { query, withClient } from '../db.js'
import { optionalAuth, requireAuth, isAdmin } from '../auth.js'
import { nextDisplayOrder, updateOrder, pick, buildInsert, buildUpdate } from '../util.js'
import { fail } from '../errors.js'
import { refreshPath, invalidateCachedPath, syncEntitySeoCache } from '../seo/cache.js'

const router = Router()

const FIELDS = [
  'name', 'slug', 'description', 'full_description', 'category', 'type',
  'delivery_time', 'volume_m3', 'weight_kg', 'in_stock', 'model_url',
  'model_max_url', 'additional_models', 'images', 'specifications', 'status',
  'private_token', 'show_only_on_main_model', 'document_url', 'parent_product_id',
  'showroom_upholstery_variant_id',
  'display_order', 'seo_title', 'seo_description', 'feed_price',
]

/** Public list — never expose private_token */
const LIST_COLS_PUBLIC = `id, name, type, status, created_at, display_order, images, slug,
  parent_product_id, show_only_on_main_model, document_url`

/** Admin list — includes private_token for link_only management */
const LIST_COLS_ADMIN = `${LIST_COLS_PUBLIC}, private_token`

function stripPrivateToken(row) {
  if (!row) return row
  const { private_token, ...rest } = row
  return rest
}

function canAccessProduct(req, row, accessKey) {
  if (isAdmin(req)) return true
  if (row.status === 'published') return true
  if (row.status === 'link_only' && row.private_token) {
    // URL shape from admin: /product/{private_token} → accessKey is the token
    if (accessKey && accessKey === row.private_token) return true
    if (req.query.token && req.query.token === row.private_token) return true
  }
  return false
}

function respondProduct(req, res, row, accessKey) {
  if (!row) return res.status(404).json({ error: 'Продукт не найден' })
  if (!canAccessProduct(req, row, accessKey)) {
    return res.status(404).json({ error: 'Продукт не найден' })
  }
  res.json(isAdmin(req) ? row : stripPrivateToken(row))
}

router.get('/', optionalAuth, async (req, res) => {
  try {
    const admin = isAdmin(req)
    const cols = admin ? LIST_COLS_ADMIN : LIST_COLS_PUBLIC
    const sql = admin
      ? `SELECT ${cols} FROM products ORDER BY display_order ASC NULLS LAST, created_at DESC LIMIT 1000`
      : `SELECT ${cols} FROM products WHERE status = 'published'
         ORDER BY display_order ASC NULLS LAST, created_at DESC LIMIT 1000`
    const { rows } = await query(sql)
    res.json(rows)
  } catch (e) {
    fail(res, e)
  }
})

router.put('/order', requireAuth, async (req, res) => {
  try {
    await updateOrder('products', req.body?.orderUpdates || req.body)
    res.json({ ok: true })
  } catch (e) {
    fail(res, e)
  }
})

/**
 * Lookup by slug OR private_token (admin shares /product/{private_token} for link_only).
 */
const PRODUCT_WITH_PARENT_SQL = `
  SELECT p.*,
         parent.slug AS parent_slug
  FROM products p
  LEFT JOIN products parent
    ON parent.id = p.parent_product_id
   AND parent.status = 'published'`

router.get('/slug/:slug', optionalAuth, async (req, res) => {
  try {
    const key = req.params.slug
    const { rows } = await query(
      `${PRODUCT_WITH_PARENT_SQL}
       WHERE p.slug = $1 OR p.private_token = $1
       LIMIT 1`,
      [key]
    )
    respondProduct(req, res, rows[0], key)
  } catch (e) {
    fail(res, e)
  }
})

router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `${PRODUCT_WITH_PARENT_SQL}
       WHERE p.id = $1
       LIMIT 1`,
      [req.params.id]
    )
    respondProduct(req, res, rows[0], req.query.token || null)
  } catch (e) {
    fail(res, e)
  }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const data = pick(req.body || {}, FIELDS)
    if (data.display_order == null) data.display_order = await nextDisplayOrder('products')
    if (!data.status) data.status = 'draft'
    const ins = buildInsert('products', data)
    const { rows } = await query(ins.text, ins.values)
    const row = rows[0]
    if (row?.status === 'published' && row.slug) {
      refreshPath(`/product/${row.slug}`).catch((e) =>
        console.error('[seo-cache] product create warm', e.message)
      )
    }
    res.status(201).json(row)
  } catch (e) {
    fail(res, e)
  }
})

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { rows: beforeRows } = await query(
      'SELECT slug, status FROM products WHERE id = $1 LIMIT 1',
      [req.params.id]
    )
    const before = beforeRows[0]
    if (!before) return res.status(404).json({ error: 'Не найден' })

    const data = pick(req.body || {}, FIELDS)
    const upd = buildUpdate('products', req.params.id, data)
    if (!upd) return res.status(400).json({ error: 'Нет данных для обновления' })
    const { rows } = await query(upd.text, upd.values)
    if (!rows[0]) return res.status(404).json({ error: 'Не найден' })
    const row = rows[0]

    syncEntitySeoCache({
      kind: 'product',
      oldSlug: before.slug,
      newSlug: row.slug,
      published: row.status === 'published',
    }).catch((e) => console.error('[seo-cache] product patch', e.message))

    res.json(row)
  } catch (e) {
    fail(res, e)
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id
    const { rows: beforeRows } = await query(
      'SELECT slug FROM products WHERE id = $1 LIMIT 1',
      [id]
    )
    const slug = beforeRows[0]?.slug

    const rowCount = await withClient(async (client) => {
      await client.query('BEGIN')
      try {
        await client.query('DELETE FROM product_projects WHERE product_id = $1', [id])
        await client.query(
          'UPDATE products SET parent_product_id = NULL WHERE parent_product_id = $1',
          [id]
        )
        await client.query('UPDATE projects SET product_id = NULL WHERE product_id = $1', [id])
        const result = await client.query('DELETE FROM products WHERE id = $1', [id])
        await client.query('COMMIT')
        return result.rowCount
      } catch (e) {
        await client.query('ROLLBACK')
        throw e
      }
    })
    if (!rowCount) return res.status(404).json({ error: 'Не найден' })

    if (slug) {
      invalidateCachedPath(`/product/${slug}`).catch(() => {})
    }

    res.json({ ok: true })
  } catch (e) {
    fail(res, e)
  }
})

export default router
