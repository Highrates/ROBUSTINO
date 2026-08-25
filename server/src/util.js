import { query, withClient } from './db.js'

/** Tables allowed in dynamic SQL helpers (order / insert / update builders). */
export const ALLOWED_TABLES = new Set([
  'products',
  'articles',
  'projects',
  'faq',
  'faq_links',
  'presentation',
  'upholstery_collections',
  'upholstery_variants',
  'product_projects',
])

function assertTable(table) {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`Invalid table: ${table}`)
  }
}

export async function nextDisplayOrder(table) {
  assertTable(table)
  const { rows } = await query(
    `SELECT COALESCE(MAX(display_order), -1) + 1 AS next FROM ${table}`
  )
  return rows[0]?.next ?? 0
}

export async function updateOrder(table, orderUpdates) {
  assertTable(table)
  if (!Array.isArray(orderUpdates) || !orderUpdates.length) return

  await withClient(async (client) => {
    await client.query('BEGIN')
    try {
      for (const item of orderUpdates) {
        await client.query(
          `UPDATE ${table} SET display_order = $1, updated_at = NOW() WHERE id = $2`,
          [item.display_order, item.id]
        )
      }
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    }
  })
}

/** Only allow known columns through */
export function pick(obj, allowed) {
  const out = {}
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      out[key] = obj[key]
    }
  }
  return out
}

export function buildInsert(table, data) {
  assertTable(table)
  const keys = Object.keys(data)
  const cols = keys.map((k) => `"${k}"`).join(', ')
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ')
  return {
    text: `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) RETURNING *`,
    values: keys.map((k) => data[k]),
  }
}

export function buildUpdate(table, id, data) {
  assertTable(table)
  const keys = Object.keys(data)
  if (!keys.length) return null
  const sets = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ')
  return {
    text: `UPDATE ${table} SET ${sets}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING *`,
    values: [...keys.map((k) => data[k]), id],
  }
}
