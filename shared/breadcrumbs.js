/**
 * BreadcrumbList node for JSON-LD @graph (no @context — parent provides it).
 * @param {{ name: string, path?: string }[]} crumbs
 * @param {(path: string) => string} absoluteUrl
 * @returns {object|null}
 */
export function buildBreadcrumbListEntity(crumbs, absoluteUrl) {
  const items = (crumbs || []).filter((c) => c && String(c.name || '').trim())
  if (items.length < 2 || typeof absoluteUrl !== 'function') return null

  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => {
      const el = {
        '@type': 'ListItem',
        position: i + 1,
        name: String(c.name).trim(),
      }
      if (c.path) {
        el.item = absoluteUrl(c.path.startsWith('/') ? c.path : `/${c.path}`)
      }
      return el
    }),
  }
}

/** Главная → Каталог → модель */
export function productBreadcrumbCrumbs(productName, productPath) {
  const name = String(productName || '').trim() || 'Модель'
  const path =
    productPath && String(productPath).startsWith('/')
      ? productPath
      : productPath
        ? `/product/${productPath}`
        : undefined
  return [
    { name: 'Главная', path: '/' },
    { name: 'Каталог', path: '/products' },
    { name, path },
  ]
}
