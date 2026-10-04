/** Cyrillic → latin map for URL slugs */
const TR = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

/**
 * Build a URL-safe latin slug from Russian/Latin text.
 */
export function slugify(input, { maxLength = 80 } = {}) {
  const raw = String(input || '')
    .trim()
    .toLowerCase()
    .split('')
    .map((ch) => (Object.prototype.hasOwnProperty.call(TR, ch) ? TR[ch] : ch))
    .join('')
  const slug = raw
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '')
  return slug || 'page'
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value) {
  return UUID_RE.test(String(value || ''))
}

/** Public path for an internal FAQ page. */
export function faqPagePath(link) {
  if (!link) return '/'
  const key = link.slug || link.id
  return key ? `/page/${key}` : '/'
}
