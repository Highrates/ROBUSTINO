import fs from 'fs/promises'
import path from 'path'
import { SEO_CACHE_DIR } from './config.js'
import { buildSeoHtml } from './shell.js'
import { STATIC, productMeta, articleMeta, faqMeta } from './meta.js'
import {
  getPublishedProductBySlug,
  getPublishedArticleBySlug,
  getActiveFaqPage,
  listAllSeoPaths,
} from './queries.js'

function cacheFileForPath(urlPath) {
  const safe =
    urlPath === '/'
      ? '_root'
      : urlPath.replace(/^\//, '').replace(/[^a-zA-Z0-9/_-]/g, '_').replace(/\//g, '__')
  return path.join(SEO_CACHE_DIR, `${safe}.html`)
}

export async function ensureCacheDir() {
  await fs.mkdir(SEO_CACHE_DIR, { recursive: true })
}

export async function readCachedHtml(urlPath) {
  try {
    return await fs.readFile(cacheFileForPath(urlPath), 'utf8')
  } catch {
    return null
  }
}

async function readCachedHtmlWithStat(urlPath) {
  try {
    const file = cacheFileForPath(urlPath)
    const [html, stat] = await Promise.all([fs.readFile(file, 'utf8'), fs.stat(file)])
    return { html, mtimeMs: stat.mtimeMs }
  } catch {
    return null
  }
}

export async function writeCachedHtml(urlPath, html) {
  await ensureCacheDir()
  await fs.writeFile(cacheFileForPath(urlPath), html, 'utf8')
}

export async function invalidateCachedPath(urlPath) {
  if (!urlPath) return
  try {
    await fs.unlink(cacheFileForPath(urlPath))
  } catch {
    /* ignore missing */
  }
}

export async function invalidateCachedPaths(urlPaths) {
  await Promise.all([...new Set(urlPaths.filter(Boolean))].map(invalidateCachedPath))
}

/**
 * Resolve meta for a public URL path. Returns null for unknown / unpublished / deleted.
 * Dynamic entities include `updatedAt` for cache freshness checks.
 */
export async function resolveMetaForPath(urlPath) {
  if (STATIC[urlPath]) return { ...STATIC[urlPath], updatedAt: null }

  let m = urlPath.match(/^\/product\/([^/]+)$/)
  if (m) {
    const product = await getPublishedProductBySlug(decodeURIComponent(m[1]))
    if (!product) return null
    return { ...productMeta(product), updatedAt: product.updated_at || null }
  }

  m = urlPath.match(/^\/article\/([^/]+)$/)
  if (m) {
    const article = await getPublishedArticleBySlug(decodeURIComponent(m[1]))
    if (!article) return null
    return { ...articleMeta(article), updatedAt: article.updated_at || null }
  }

  m = urlPath.match(/^\/page\/([^/]+)$/)
  if (m) {
    const page = await getActiveFaqPage(decodeURIComponent(m[1]))
    if (!page) return null
    return { ...faqMeta(page), updatedAt: page.updated_at || null }
  }

  return null
}

export async function renderAndCache(urlPath, metaHint = null) {
  const meta = metaHint || (await resolveMetaForPath(urlPath))
  if (!meta) {
    await invalidateCachedPath(urlPath)
    return null
  }
  const html = await buildSeoHtml(meta)
  await writeCachedHtml(urlPath, html)
  return html
}

/**
 * Serve SEO HTML with revalidation:
 * - deleted / unpublished / unknown → drop cache, return null (caller → 404)
 * - entity updated after cache mtime → rebuild
 * - otherwise serve disk cache
 */
export async function getHtmlForPath(urlPath, { useCache = true } = {}) {
  const meta = await resolveMetaForPath(urlPath)
  if (!meta) {
    await invalidateCachedPath(urlPath)
    return null
  }

  if (useCache) {
    const cached = await readCachedHtmlWithStat(urlPath)
    if (cached) {
      const updatedMs = meta.updatedAt ? new Date(meta.updatedAt).getTime() : 0
      // Static pages (no updatedAt): cache is valid until invalidated/warmed
      // Dynamic: only reuse if file is at least as new as DB row
      if (!updatedMs || cached.mtimeMs >= updatedMs) {
        return cached.html
      }
    }
  }

  return renderAndCache(urlPath, meta)
}

/** Warm all public SEO paths into disk cache. */
export async function warmAllSeoCache() {
  const paths = await listAllSeoPaths()
  const results = { ok: 0, fail: 0, paths: [] }
  for (const p of paths) {
    try {
      const html = await renderAndCache(p)
      if (!html) {
        results.fail += 1
        continue
      }
      results.ok += 1
      results.paths.push(p)
    } catch (e) {
      results.fail += 1
      console.error('[seo-cache] warm failed', p, e.message)
    }
  }
  return results
}

/** Invalidate + optionally rewarm a product/article path after publish. */
export async function refreshPath(urlPath) {
  await invalidateCachedPath(urlPath)
  return renderAndCache(urlPath)
}

/**
 * After product/article mutate: drop old slug cache if slug changed,
 * then refresh or drop the current path by status.
 */
export async function syncEntitySeoCache({
  kind,
  oldSlug,
  newSlug,
  published,
}) {
  const prefix = kind === 'article' ? '/article/' : '/product/'
  const pathsToDrop = []
  if (oldSlug && oldSlug !== newSlug) {
    pathsToDrop.push(`${prefix}${oldSlug}`)
  }
  if (!published && newSlug) {
    pathsToDrop.push(`${prefix}${newSlug}`)
  }
  await invalidateCachedPaths(pathsToDrop)

  if (published && newSlug) {
    return refreshPath(`${prefix}${newSlug}`)
  }
  return null
}

/** FAQ internal page: warm when active+internal, else drop. */
export async function syncFaqSeoCache(row) {
  if (!row?.id) return null
  const pagePath = `/page/${row.id}`
  const live = row.is_active !== false && row.is_internal_page === true
  if (live) return refreshPath(pagePath)
  await invalidateCachedPath(pagePath)
  return null
}
