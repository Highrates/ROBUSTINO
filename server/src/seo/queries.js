import { query } from '../db.js'

export async function listPublishedProductSlugs() {
  const { rows } = await query(
    `SELECT slug, updated_at FROM products
     WHERE status = 'published'
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

export async function listActiveInternalFaqPages() {
  const { rows } = await query(
    `SELECT id, updated_at FROM faq_links
     WHERE is_active = true AND is_internal_page = true
     ORDER BY display_order ASC NULLS LAST`
  )
  return rows
}

export async function getPublishedProductBySlug(slug) {
  const { rows } = await query(
    `SELECT * FROM products WHERE slug = $1 LIMIT 1`,
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

export async function getActiveFaqPage(id) {
  const { rows } = await query(
    `SELECT id, name, rich_text, page_content, is_active, is_internal_page, updated_at
     FROM faq_links WHERE id = $1 LIMIT 1`,
    [id]
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
    ...pages.map((p) => `/page/${p.id}`),
  ]
}
