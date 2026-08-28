/** Счётчик на сайте (index.html). */
export const METRIKA_ID = 111093439

/** Идентификаторы целей — создайте их в Яндекс.Метрике с теми же именами. */
export const METRIKA_GOALS = {
  CHAT_MESSAGE: 'chat_message',
  PRODUCT_VIEW: 'product_view',
  OBJECT_VIEW: 'object_view',
}

function canTrack() {
  return (
    typeof window !== 'undefined' &&
    typeof window.ym === 'function' &&
    !window.location.pathname.startsWith('/admin')
  )
}

/** @param {string} goal @param {Record<string, unknown>} [params] */
export function reachMetrikaGoal(goal, params) {
  if (!canTrack()) return
  if (params && Object.keys(params).length > 0) {
    window.ym(METRIKA_ID, 'reachGoal', goal, params)
  } else {
    window.ym(METRIKA_ID, 'reachGoal', goal)
  }
}

export function trackProductView(product) {
  if (!product?.id) return
  reachMetrikaGoal(METRIKA_GOALS.PRODUCT_VIEW, {
    product_id: String(product.id),
    product_slug: product.slug || '',
    product_name: product.name || '',
  })
}

export function trackObjectView(project) {
  if (!project?.id) return
  reachMetrikaGoal(METRIKA_GOALS.OBJECT_VIEW, {
    object_id: String(project.id),
    object_name: project.name || '',
  })
}

export function trackChatMessage({ hasText = false, hasAttachments = false } = {}) {
  reachMetrikaGoal(METRIKA_GOALS.CHAT_MESSAGE, {
    has_text: hasText ? 1 : 0,
    has_attachments: hasAttachments ? 1 : 0,
  })
}
