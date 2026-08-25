#!/usr/bin/env node
/**
 * Convert backup/db/*.json → SQL INSERTs.
 * Usage:
 *   node scripts/json-to-sql.mjs --out backup/db/data.sql
 */
import { readFile, writeFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dbDir = join(root, 'backup/db')

const outIdx = process.argv.indexOf('--out')
const outFile = outIdx >= 0 ? process.argv[outIdx + 1] : null

const tables = [
  'upholstery_collections',
  'products',
  'articles',
  'projects',
  'product_projects',
  'faq',
  'faq_links',
  'presentation',
  'upholstery_variants',
]

function sqlLiteral(v) {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL'
  if (Array.isArray(v)) {
    if (v.length === 0) return `'{}'::text[]`
    return `ARRAY[${v.map(sqlLiteral).join(', ')}]::text[]`
  }
  if (typeof v === 'object') {
    return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`
  }
  return `'${String(v).replace(/'/g, "''")}'`
}

function quoteIdent(name) {
  return `"${name.replace(/"/g, '""')}"`
}

function insertSql(table, rows) {
  if (!rows.length) return `-- ${table}: 0 rows\n`
  const cols = Object.keys(rows[0])
  const colList = cols.map(quoteIdent).join(', ')
  const lines = [`-- ${table}: ${rows.length} rows`]
  for (const row of rows) {
    const vals = cols.map((c) => sqlLiteral(row[c])).join(', ')
    lines.push(
      `INSERT INTO public.${quoteIdent(table)} (${colList}) VALUES (${vals}) ON CONFLICT (id) DO NOTHING;`
    )
  }
  return lines.join('\n') + '\n'
}

let sql = `-- ROBUSTINO data import (from backup/db JSON)\nBEGIN;\n\n`

for (const table of tables) {
  const rows = JSON.parse(await readFile(join(dbDir, `${table}.json`), 'utf8'))
  if (table === 'products') {
    // Insert without parents first, then UPDATE (handles nested hierarchy)
    const ids = new Set(rows.map((r) => r.id))
    const withoutParent = rows.map((r) => ({ ...r, parent_product_id: null }))
    sql += insertSql('products', withoutParent)
    for (const r of rows) {
      if (!r.parent_product_id || !ids.has(r.parent_product_id)) continue
      sql += `UPDATE public."products" SET "parent_product_id" = '${r.parent_product_id}' WHERE "id" = '${r.id}';\n`
    }
  } else {
    sql += insertSql(table, rows)
  }
  sql += '\n'
}

sql += 'COMMIT;\n'

if (outFile) {
  await writeFile(outFile, sql)
  console.error(`Wrote ${outFile} (${(sql.length / 1024).toFixed(1)} KB)`)
} else {
  process.stdout.write(sql)
}
