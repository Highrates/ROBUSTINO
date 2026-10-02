import { SITE_PUBLIC_URL, absoluteUrl, escapeXml, truncateMeta } from './config.js'
import { listPublishedProductsForFeed } from './queries.js'

function pad(n) {
  return String(n).padStart(2, '0')
}

function ymlDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Availability from admin select values (exact), not loose regex.
 * Options: "В наличии" | "Под заказ" | "Нет в наличии" | empty
 */
export function resolveFeedAvailable(inStock) {
  const s = String(inStock || '').trim().toLowerCase()
  if (!s) return true
  if (s === 'нет в наличии') return false
  return true
}

/**
 * Yandex YML feed for product campaigns / smart banners.
 * Offers without feed_price > 0 or without pictures are skipped
 * (price=1 placeholders poison Direct moderation).
 */
export async function buildYmlFeed() {
  const products = await listPublishedProductsForFeed()
  const categories = new Map()
  let catId = 1

  const eligible = []
  for (const p of products) {
    const price = Number(p.feed_price)
    const pictures = (Array.isArray(p.images) ? p.images : []).filter(Boolean)
    if (!(price > 0) || pictures.length === 0) continue

    const catName = (p.category || p.type || 'Кресла').trim() || 'Кресла'
    if (!categories.has(catName)) categories.set(catName, catId++)
    eligible.push({ p, price, pictures, catName })
  }

  const categoryXml = [...categories.entries()]
    .map(([name, id]) => `    <category id="${id}">${escapeXml(name)}</category>`)
    .join('\n')

  const offers = eligible
    .map(({ p, price, pictures, catName }) => {
      const categoryId = categories.get(catName)
      const url = absoluteUrl(`/product/${p.slug}`)
      const pictureXml = pictures
        .slice(0, 10)
        .map((img) => `      <picture>${escapeXml(absoluteUrl(img))}</picture>`)
        .join('\n')
      const desc = truncateMeta(
        p.seo_description || p.description || 'Кресло ROBUSTINO.',
        3000
      )
      const available = resolveFeedAvailable(p.in_stock) ? 'true' : 'false'
      const name = escapeXml(p.name)

      return `    <offer id="${escapeXml(p.id)}" available="${available}">
      <url>${escapeXml(url)}</url>
      <price>${price}</price>
      <currencyId>RUR</currencyId>
      <categoryId>${categoryId}</categoryId>
${pictureXml}
      <name>${name}</name>
      <vendor>ROBUSTINO</vendor>
      <description>${escapeXml(desc)}</description>
    </offer>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="${ymlDate()}">
  <shop>
    <name>ROBUSTINO</name>
    <company>ROBUSTINO</company>
    <url>${escapeXml(SITE_PUBLIC_URL)}</url>
    <currencies>
      <currency id="RUR" rate="1"/>
    </currencies>
    <categories>
${categoryXml}
    </categories>
    <offers>
${offers}
    </offers>
  </shop>
</yml_catalog>
`
}
