import { Router } from 'express'
import { query } from '../db.js'
import { optionalAuth, requireAuth, isAdmin } from '../auth.js'
import { fail } from '../errors.js'
import { nextDisplayOrder, updateOrder, pick, buildInsert, buildUpdate } from '../util.js'
import { syncFaqSeoCache, invalidateCachedPath } from '../seo/cache.js'
import { slugify, isUuid, faqPagePath } from '../../../shared/slugify.js'

const router = Router()
const FIELDS = [
  'name', 'slug', 'document_url', 'rich_text', 'display_order', 'is_active',
  'is_internal_page', 'page_content',
]

async function allocateUniqueSlug(base, excludeId = null) {
  const candidate = slugify(base)
  for (let i = 0; i < 50; i += 1) {
    const trySlug = i === 0 ? candidate : `${candidate}-${i + 1}`
    const { rows } = await query(
      excludeId
        ? `SELECT id FROM faq_links WHERE slug = $1 AND id <> $2 LIMIT 1`
        : `SELECT id FROM faq_links WHERE slug = $1 LIMIT 1`,
      excludeId ? [trySlug, excludeId] : [trySlug]
    )
    if (!rows[0]) return trySlug
  }
  return `${candidate}-${Date.now()}`
}

router.get('/', optionalAuth, async (req, res) => {
  try {
    const sql = isAdmin(req)
      ? `SELECT * FROM faq_links ORDER BY display_order ASC NULLS LAST LIMIT 1000`
      : `SELECT * FROM faq_links WHERE is_active = true ORDER BY display_order ASC NULLS LAST LIMIT 1000`
    const { rows } = await query(sql)
    res.json(rows)
  } catch (e) {
    fail(res, e)
  }
})

router.put('/order', requireAuth, async (req, res) => {
  try {
    await updateOrder('faq_links', req.body?.orderUpdates || req.body)
    res.json({ ok: true })
  } catch (e) {
    fail(res, e)
  }
})

/** Lookup by UUID id or by slug. */
router.get('/:idOrSlug', optionalAuth, async (req, res) => {
  try {
    const key = req.params.idOrSlug
    const { rows } = await query(
      isUuid(key)
        ? `SELECT * FROM faq_links WHERE id = $1 LIMIT 1`
        : `SELECT * FROM faq_links WHERE slug = $1 LIMIT 1`,
      [key]
    )
    const row = rows[0]
    if (!row) return res.status(404).json({ error: 'Не найден' })
    if (!isAdmin(req) && row.is_active === false) {
      return res.status(404).json({ error: 'Не найден' })
    }
    res.json(row)
  } catch (e) {
    fail(res, e)
  }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const data = pick(req.body || {}, FIELDS)
    if (data.display_order == null) data.display_order = await nextDisplayOrder('faq_links')

    if (data.is_internal_page) {
      data.slug = await allocateUniqueSlug(data.slug || data.name || 'page')
    } else {
      data.slug = data.slug ? await allocateUniqueSlug(data.slug) : null
    }

    const ins = buildInsert('faq_links', data)
    const { rows } = await query(ins.text, ins.values)
    const row = rows[0]
    syncFaqSeoCache(row).catch((e) =>
      console.error('[seo-cache] faq create', e.message)
    )
    res.status(201).json(row)
  } catch (e) {
    if (e?.code === '23505') {
      return res.status(409).json({ error: 'Такой slug уже занят' })
    }
    fail(res, e)
  }
})

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { rows: beforeRows } = await query(
      'SELECT id, slug, is_internal_page FROM faq_links WHERE id = $1 LIMIT 1',
      [req.params.id]
    )
    const before = beforeRows[0]
    if (!before) return res.status(404).json({ error: 'Не найден' })

    const data = pick(req.body || {}, FIELDS)
    const willBeInternal =
      data.is_internal_page !== undefined
        ? !!data.is_internal_page
        : !!before.is_internal_page

    if (willBeInternal) {
      if (data.slug !== undefined) {
        data.slug = await allocateUniqueSlug(data.slug || data.name || before.slug || 'page', before.id)
      } else if (!before.slug) {
        data.slug = await allocateUniqueSlug(data.name || before.slug || 'page', before.id)
      }
    } else if (data.is_internal_page === false) {
      data.slug = null
    }

    const upd = buildUpdate('faq_links', req.params.id, data)
    if (!upd) return res.status(400).json({ error: 'Нет данных' })
    const { rows } = await query(upd.text, upd.values)
    if (!rows[0]) return res.status(404).json({ error: 'Не найден' })
    const row = rows[0]

    syncFaqSeoCache(row, {
      oldSlug: before.slug,
      oldId: before.id,
    }).catch((e) => console.error('[seo-cache] faq patch', e.message))

    res.json(row)
  } catch (e) {
    if (e?.code === '23505') {
      return res.status(409).json({ error: 'Такой slug уже занят' })
    }
    fail(res, e)
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id
    const { rows: beforeRows } = await query(
      'SELECT id, slug FROM faq_links WHERE id = $1 LIMIT 1',
      [id]
    )
    const before = beforeRows[0]
    const { rowCount } = await query('DELETE FROM faq_links WHERE id = $1', [id])
    if (!rowCount) return res.status(404).json({ error: 'Не найден' })
    if (before) {
      invalidateCachedPath(faqPagePath(before)).catch(() => {})
      invalidateCachedPath(`/page/${before.id}`).catch(() => {})
    }
    res.json({ ok: true })
  } catch (e) {
    fail(res, e)
  }
})

export default router
