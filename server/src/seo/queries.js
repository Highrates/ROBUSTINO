import { query } from '../db.js'

/** Indexable catalog URLs only (exclude config-only children). */
export async function listPublishedProductSlugs() {
  const { rows } = await query(
    `SELECT slug, updated_at FROM products
     WHERE status = 'published'
       AND COALESCE(show_only_on_main_model, false) = false
     ORDER BY display_order ASC NULLS LAST, created_at DESC`
  )
  return rows
}

export async function listPublishedArticleSlugs() {
  const { rows } = await query(
    `SELECT slug, updated_at, published_at FROM articles
     WHERE status = 'published'
     ORDER BY display_order ASC NULLS LAST, created_at DESC`
  )
  return rows
}

/** Active FAQ Q&A for homepage FAQPage schema. */
export async function listActiveFaqs() {
  const { rows } = await query(
    `SELECT id, question, answer, display_order, is_active, updated_at, created_at
     FROM faq
     WHERE is_active = true
     ORDER BY display_order ASC NULLS LAST, created_at ASC`
  )
  return rows
}

export async function listActiveInternalFaqPages() {
  const { rows } = await query(
    `SELECT id, slug, updated_at FROM faq_links
     WHERE is_active = true AND is_internal_page = true AND slug IS NOT NULL
     ORDER BY display_order ASC NULLS LAST`
  )
  return rows
}

export async function getPublishedProductBySlug(slug) {
  const { rows } = await query(
    `SELECT p.*,
            parent.slug AS parent_slug
     FROM products p
     LEFT JOIN products parent
       ON parent.id = p.parent_product_id
      AND parent.status = 'published'
     WHERE p.slug = $1
     LIMIT 1`,
    [slug]
  )
  const row = rows[0]
  if (!row || row.status !== 'published') return null
  return row
}

export async function getPublishedArticleBySlug(slug) {
  const { rows } = await query(
    `SELECT * FROM articles WHERE slug = $1 LIMIT 1`,
    [slug]
  )
  const row = rows[0]
  if (!row || row.status !== 'published') return null
  return row
}

/** Resolve by slug or legacy UUID id. */
export async function getActiveFaqPage(idOrSlug) {
  const key = String(idOrSlug || '')
  const byId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      key
    )
  const { rows } = await query(
    byId
      ? `SELECT id, name, slug, rich_text, page_content, is_active, is_internal_page, updated_at
         FROM faq_links WHERE id = $1 LIMIT 1`
      : `SELECT id, name, slug, rich_text, page_content, is_active, is_internal_page, updated_at
         FROM faq_links WHERE slug = $1 LIMIT 1`,
    [key]
  )
  const row = rows[0]
  if (!row || row.is_active === false || !row.is_internal_page) return null
  return row
}

export async function listPublishedProductsForFeed() {
  const { rows } = await query(
    `SELECT * FROM products
     WHERE status = 'published'
     ORDER BY display_order ASC NULLS LAST, created_at DESC`
  )
  return rows
}

export async function listAllSeoPaths() {
  const staticPaths = [
    '/',
    '/products',
    '/about',
    '/articles',
    '/projects',
    '/upholstery',
  ]
  const [products, articles, pages] = await Promise.all([
    listPublishedProductSlugs(),
    listPublishedArticleSlugs(),
    listActiveInternalFaqPages(),
  ])
  return [
    ...staticPaths,
    ...products.map((p) => `/product/${p.slug}`),
    ...articles.map((a) => `/article/${a.slug}`),
    ...pages.map((p) => `/page/${p.slug || p.id}`),
  ]
}
