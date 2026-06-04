/** Список моделей каталога (/products) в порядке display_order */
export function getCatalogProducts(products) {
  if (!products?.length) return []

  return products
    .filter((product) => product?.status === 'published' && !product.show_only_on_main_model)
    .sort((a, b) => {
      if (a.display_order != null && b.display_order != null) {
        return a.display_order - b.display_order
      }
      if (a.display_order != null) return -1
      if (b.display_order != null) return 1
      const aDate = a.created_at ? new Date(a.created_at) : new Date(0)
      const bDate = b.created_at ? new Date(b.created_at) : new Date(0)
      return bDate - aDate
    })
}

/** Индекс модели в каталоге; для конфигураций «только на странице модели» — индекс родителя */
export function getCatalogProductIndex(product, catalogProducts) {
  if (!product || !catalogProducts.length) return -1

  const directIndex = catalogProducts.findIndex((p) => p.id === product.id)
  if (directIndex !== -1) return directIndex

  if (product.parent_product_id) {
    return catalogProducts.findIndex((p) => p.id === product.parent_product_id)
  }

  return -1
}

/** Следующая модель каталога по кругу */
export function getNextCatalogProduct(currentProduct, catalogProducts) {
  if (!catalogProducts.length) return null

  const currentIndex = currentProduct
    ? getCatalogProductIndex(currentProduct, catalogProducts)
    : -1

  const nextIndex = (currentIndex + 1 + catalogProducts.length) % catalogProducts.length
  return catalogProducts[nextIndex] ?? null
}

export function getProductPath(product) {
  if (!product) return null
  if (product.slug) return `/product/${product.slug}`
  if (product.id) return `/product/${product.id}`
  return null
}
