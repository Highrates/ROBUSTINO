import { SITE_PUBLIC_URL, escapeXml } from './config.js'
import {
  listPublishedProductSlugs,
  listPublishedArticleSlugs,
  listActiveInternalFaqPages,
} from './queries.js'

const STATIC_URLS = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/products', changefreq: 'weekly', priority: '0.9' },
  { loc: '/about', changefreq: 'monthly', priority: '0.6' },
  { loc: '/articles', changefreq: 'weekly', priority: '0.7' },
  { loc: '/projects', changefreq: 'weekly', priority: '0.7' },
  { loc: '/upholstery', changefreq: 'monthly', priority: '0.5' },
]

function urlEntry({ loc, lastmod, changefreq, priority }) {
  const last = lastmod
    ? `\n    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>`
    : ''
  return `  <url>
    <loc>${escapeXml(SITE_PUBLIC_URL + loc)}</loc>${last}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}

/** Build sitemap.xml body (single source of truth). */
export async function buildSitemapXml() {
  const [products, articles, pages] = await Promise.all([
    listPublishedProductSlugs(),
    listPublishedArticleSlugs(),
    listActiveInternalFaqPages(),
  ])

  const entries = [
    ...STATIC_URLS.map((u) => urlEntry(u)),
    ...products.map((p) =>
      urlEntry({
        loc: `/product/${p.slug}`,
        lastmod: p.updated_at,
        changefreq: 'weekly',
        priority: '0.8',
      })
    ),
    ...articles.map((a) =>
      urlEntry({
        loc: `/article/${a.slug}`,
        lastmod: a.updated_at || a.published_at,
        changefreq: 'monthly',
        priority: '0.6',
      })
    ),
    ...pages.map((p) =>
      urlEntry({
        loc: `/page/${p.id}`,
        lastmod: p.updated_at,
        changefreq: 'monthly',
        priority: '0.4',
      })
    ),
  ]

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`
}
