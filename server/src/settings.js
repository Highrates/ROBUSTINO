import { query } from './db.js'
import { SITE_CHAT_STAFF_AVATAR_URL } from '../../shared/siteChatLimits.js'

const ADMIN_AVATAR_KEY = 'admin_avatar_url'

let cache = { url: null, at: 0 }
const CACHE_MS = 30_000
let tableReady = false

export function invalidateStaffAvatarCache() {
  cache = { url: null, at: 0 }
}

async function ensureSiteSettingsTable() {
  if (tableReady) return
  await query(`
    CREATE TABLE IF NOT EXISTS public.site_settings (
      key text NOT NULL,
      value text NOT NULL,
      updated_at timestamp with time zone DEFAULT now(),
      CONSTRAINT site_settings_pkey PRIMARY KEY (key)
    )
  `)
  tableReady = true
}

/** Custom admin avatar or default logo. */
export async function getStaffAvatarUrl() {
  if (Date.now() - cache.at < CACHE_MS) {
    return cache.url || SITE_CHAT_STAFF_AVATAR_URL
  }
  try {
    await ensureSiteSettingsTable()
    const { rows } = await query(`SELECT value FROM site_settings WHERE key = $1`, [
      ADMIN_AVATAR_KEY,
    ])
    cache = { url: rows[0]?.value?.trim() || null, at: Date.now() }
  } catch {
    cache = { url: null, at: Date.now() }
  }
  return cache.url || SITE_CHAT_STAFF_AVATAR_URL
}

export async function getAdminAvatarUrlRaw() {
  await ensureSiteSettingsTable()
  const { rows } = await query(`SELECT value FROM site_settings WHERE key = $1`, [ADMIN_AVATAR_KEY])
  return rows[0]?.value?.trim() || null
}

export async function setAdminAvatarUrl(url) {
  await ensureSiteSettingsTable()
  const value = String(url || '').trim()
  if (!value) {
    await query(`DELETE FROM site_settings WHERE key = $1`, [ADMIN_AVATAR_KEY])
    invalidateStaffAvatarCache()
    return null
  }
  await query(
    `INSERT INTO site_settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [ADMIN_AVATAR_KEY, value]
  )
  invalidateStaffAvatarCache()
  return value
}

export { ADMIN_AVATAR_KEY }
