import fs from 'fs/promises'
import path from 'path'
import { SPA_DIST, escapeHtml } from './config.js'

let cachedTemplate = null
let cachedTemplateMtime = 0

const FALLBACK_TEMPLATE = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ROBUSTINO</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`

async function loadTemplate() {
  if (!SPA_DIST) return FALLBACK_TEMPLATE
  const indexPath = path.join(SPA_DIST, 'index.html')
  try {
    const stat = await fs.stat(indexPath)
    if (cachedTemplate && stat.mtimeMs === cachedTemplateMtime) {
      return cachedTemplate
    }
    cachedTemplate = await fs.readFile(indexPath, 'utf8')
    cachedTemplateMtime = stat.mtimeMs
    return cachedTemplate
  } catch {
    return FALLBACK_TEMPLATE
  }
}

function upsertMeta(html, attr, key, content) {
  if (!content) return html
  const reName = new RegExp(
    `<meta[^>]+${attr}=["']${key}["'][^>]*>`,
    'i'
  )
  const tag = `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`
  if (reName.test(html)) {
    return html.replace(reName, tag)
  }
  return html.replace(/<\/head>/i, `  ${tag}\n  </head>`)
}

function upsertLink(html, rel, href) {
  const re = new RegExp(`<link[^>]+rel=["']${rel}["'][^>]*>`, 'i')
  const tag = `<link rel="${rel}" href="${escapeHtml(href)}" />`
  if (re.test(html)) return html.replace(re, tag)
  return html.replace(/<\/head>/i, `  ${tag}\n  </head>`)
}

/**
 * Build HTML document with SEO meta + crawlable content snippet.
 */
export async function buildSeoHtml(meta) {
  let html = await loadTemplate()
  const title = meta.title || 'ROBUSTINO'
  const description = meta.description || ''
  const canonical = meta.canonical
  const image = meta.image
  const ogType =
    meta.type === 'product' ? 'product' : meta.type === 'article' ? 'article' : 'website'

  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`)
  html = upsertMeta(html, 'name', 'description', description)
  if (canonical) html = upsertLink(html, 'canonical', canonical)

  html = upsertMeta(html, 'property', 'og:site_name', 'ROBUSTINO')
  html = upsertMeta(html, 'property', 'og:title', title)
  html = upsertMeta(html, 'property', 'og:description', description)
  if (canonical) html = upsertMeta(html, 'property', 'og:url', canonical)
  html = upsertMeta(html, 'property', 'og:type', ogType)
  if (image) html = upsertMeta(html, 'property', 'og:image', image)

  html = upsertMeta(html, 'name', 'twitter:card', image ? 'summary_large_image' : 'summary')
  html = upsertMeta(html, 'name', 'twitter:title', title)
  html = upsertMeta(html, 'name', 'twitter:description', description)
  if (image) html = upsertMeta(html, 'name', 'twitter:image', image)

  if (meta.jsonLd) {
    const json = JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c')
    // id lets the SPA remove this before Helmet injects route JSON-LD (no duplicates)
    const script = `<script type="application/ld+json" id="seo-json-ld">${json}</script>`
    html = html.replace(/<\/head>/i, `  ${script}\n  </head>`)
  }

  const h1 = escapeHtml(meta.h1 || title)
  const bodyText = escapeHtml(meta.bodyText || description)
  const seoBlock = `<div id="seo-content"><h1>${h1}</h1><p>${bodyText}</p></div>`

  if (/id=["']root["']/.test(html)) {
    html = html.replace(
      /(<div[^>]*id=["']root["'][^>]*>)/i,
      `$1${seoBlock}`
    )
  } else {
    html = html.replace(/<body[^>]*>/i, (m) => `${m}\n${seoBlock}`)
  }

  return html
}
