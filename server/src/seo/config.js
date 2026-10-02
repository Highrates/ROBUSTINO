import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const SITE_PUBLIC_URL = (process.env.SITE_PUBLIC_URL || 'https://robustino.ru').replace(
  /\/$/,
  ''
)

/** Frontend build output (Vite dist). When set, Express serves SPA + SEO shells. */
export const SPA_DIST = process.env.SPA_DIST
  ? path.resolve(process.env.SPA_DIST)
  : null

/** Disk cache for prerendered HTML shells (P3). */
export const SEO_CACHE_DIR = process.env.SEO_CACHE_DIR
  ? path.resolve(process.env.SEO_CACHE_DIR)
  : path.resolve(__dirname, '../../.seo-cache')

export const DEFAULT_TITLE = 'ROBUSTINO — кресла для актовых и зрительных залов'
export const DEFAULT_DESCRIPTION =
  'Производитель кресел ROBUSTINO: кресла для актовых, зрительных и конференц-залов. Каталог моделей, проекты и обивка.'

/** Default Open Graph image (static pages / fallback). */
export const DEFAULT_OG_IMAGE = '/hero-Archi.png'

/** Raster logo for Organization JSON-LD (Google prefers PNG/JPG, ≥112px). */
export const ORGANIZATION_LOGO = '/logo-org.png'

/** Ensure title brand suffix is consistent for bots and SPA. */
export function formatPageTitle(title) {
  const t = String(title || '').trim()
  if (!t) return DEFAULT_TITLE
  if (/ROBUSTINO/i.test(t)) return t
  return `${t} — ROBUSTINO`
}

export function absoluteUrl(pathOrUrl) {
  if (!pathOrUrl) return SITE_PUBLIC_URL
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  const p = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${SITE_PUBLIC_URL}${p}`
}

export function resolveOgImage(imagePath) {
  return absoluteUrl(imagePath || DEFAULT_OG_IMAGE)
}

export function truncateMeta(text, max = 160) {
  const plain = String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (plain.length <= max) return plain
  return `${plain.slice(0, max - 1).trim()}…`
}

export function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function escapeXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
