#!/usr/bin/env node
/**
 * Transliterate faq_links.slug to latin (after 20261004_faq_links_slug.sql).
 * Usage: cd server && node scripts/backfill-faq-slugs.mjs
 */
import 'dotenv/config'
import { query } from '../src/db.js'
import { slugify } from '../../shared/slugify.js'

const { rows } = await query(
  `SELECT id, name, slug FROM faq_links
   WHERE is_internal_page = true
   ORDER BY created_at ASC NULLS LAST, id`
)

const used = new Set()
let updated = 0

for (const row of rows) {
  let base = slugify(row.slug || row.name || 'page')
  let next = base
  let i = 2
  while (used.has(next)) {
    next = `${base}-${i}`
    i += 1
  }
  used.add(next)

  if (next !== row.slug) {
    await query('UPDATE faq_links SET slug = $1, updated_at = now() WHERE id = $2', [
      next,
      row.id,
    ])
    console.log(`${row.id}: ${row.slug || '(null)'} → ${next}`)
    updated += 1
  } else {
    console.log(`${row.id}: ok ${next}`)
  }
}

console.log(`[faq-slugs] done updated=${updated} total=${rows.length}`)
process.exit(0)
