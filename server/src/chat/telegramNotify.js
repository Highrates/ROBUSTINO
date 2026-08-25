/**
 * One-way Telegram alerts for new guest (CUSTOMER) chat messages.
 * Configure via env — never commit the bot token.
 *
 * TELEGRAM_BOT_TOKEN          — from @BotFather
 * TELEGRAM_CHAT_ID            — one or more numeric ids, comma-separated (preferred)
 * TELEGRAM_NOTIFY_USERNAME    — one or more @usernames, comma-separated (resolve via getUpdates after /start)
 * SITE_PUBLIC_URL             — https://robustino.ru (admin deep-link base)
 * TELEGRAM_NOTIFY=0           — disable even if token set
 * TELEGRAM_DEBOUNCE_MS        — default 45000
 */

const DEBOUNCE_MS = Number(process.env.TELEGRAM_DEBOUNCE_MS || 45_000)
const SITE_PUBLIC_URL = (process.env.SITE_PUBLIC_URL || 'https://robustino.ru').replace(/\/$/, '')

/** @type {Map<string, { at: number, skipped: number, last: object, timer: ReturnType<typeof setTimeout> | null }>} */
const debounceByConv = new Map()

/** @type {Set<string>} */
const knownChatIds = new Set(
  String(process.env.TELEGRAM_CHAT_ID || '')
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
)

let lastResolveAt = 0
const RESOLVE_RETRY_MS = 5 * 60 * 1000

function enabled() {
  if (process.env.TELEGRAM_NOTIFY === '0' || process.env.TELEGRAM_NOTIFY === 'false') return false
  return Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim())
}

function parseUsernames() {
  return String(process.env.TELEGRAM_NOTIFY_USERNAME || '')
    .split(/[,;\s]+/)
    .map((s) => s.replace(/^@/, '').trim().toLowerCase())
    .filter(Boolean)
}

function apiUrl(method) {
  const token = process.env.TELEGRAM_BOT_TOKEN.trim()
  return `https://api.telegram.org/bot${token}/${method}`
}

async function tgPost(method, body) {
  const res = await fetch(apiUrl(method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.ok) {
    const desc = data?.description || res.statusText || 'telegram error'
    throw new Error(desc)
  }
  return data.result
}

/**
 * Bot API cannot send by @username until the user pressed Start.
 * Merge TELEGRAM_CHAT_ID with ids found for TELEGRAM_NOTIFY_USERNAME via getUpdates.
 * Retries periodically so late /start still gets picked up.
 */
async function resolveChatIds() {
  const wantList = parseUsernames()
  const want = new Set(wantList)
  const now = Date.now()
  const shouldFetch =
    want.size > 0 && (lastResolveAt === 0 || now - lastResolveAt >= RESOLVE_RETRY_MS)

  if (shouldFetch) {
    lastResolveAt = now
    try {
      const data = await tgPost('getUpdates', { limit: 100, timeout: 0 })
      const updates = Array.isArray(data) ? data : []
      const found = new Set()
      for (let i = updates.length - 1; i >= 0; i--) {
        const msg = updates[i]?.message || updates[i]?.edited_message
        const from = msg?.from
        const chat = msg?.chat
        if (!from || !chat) continue
        const uname = String(from.username || '').toLowerCase()
        if (!want.has(uname)) continue
        knownChatIds.add(String(chat.id))
        found.add(uname)
      }
      for (const u of want) {
        if (!found.has(u) && knownChatIds.size === 0) {
          console.warn(
            `[telegram] no chat_id for @${u} — open the bot and press Start, then set TELEGRAM_CHAT_ID`
          )
        } else if (found.has(u)) {
          console.info(`[telegram] resolved @${u}`)
        }
      }
    } catch (e) {
      console.warn('[telegram] getUpdates failed:', e.message || e)
    }
  }

  return [...knownChatIds]
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function buildText({ visitorLabel, body, pageUrl, conversationId, extraCount, attachmentCount }) {
  const who = escapeHtml(visitorLabel || 'Посетитель')
  const trimmed = String(body || '').trim()
  const att = Number(attachmentCount) || 0
  let preview = escapeHtml(trimmed.slice(0, 400))
  if (!preview && att > 0) preview = `(файл${att > 1 ? `ы ×${att}` : ''})`
  if (!preview) preview = '(пусто)'
  const adminUrl = `${SITE_PUBLIC_URL}/admin/chat?c=${encodeURIComponent(conversationId)}`
  const lines = [`<b>ROBUSTINO · новый чат</b>`, `От: ${who}`]
  if (pageUrl) lines.push(`Страница: ${escapeHtml(pageUrl)}`)
  lines.push('')
  lines.push(preview)
  if (extraCount > 0) {
    lines.push('')
    lines.push(`(+ ещё ${extraCount} за последние ${Math.round(DEBOUNCE_MS / 1000)} с)`)
  }
  lines.push('')
  lines.push(`<a href="${adminUrl}">Открыть в админке</a>`)
  return lines.join('\n')
}

async function sendNow(payload) {
  const chatIds = await resolveChatIds()
  if (!chatIds.length) return

  const text = buildText(payload)
  const results = await Promise.allSettled(
    chatIds.map((chat_id) =>
      tgPost('sendMessage', {
        chat_id,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      })
    )
  )
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    if (r.status === 'rejected') {
      console.warn(`[telegram] send to ${chatIds[i]} failed:`, r.reason?.message || r.reason)
    }
  }
}

/**
 * Fire-and-forget notify for a guest message. Debounced per conversation.
 * @param {{
 *   conversationId: string
 *   visitorLabel?: string | null
 *   body?: string
 *   pageUrl?: string | null
 *   attachmentCount?: number
 * }} opts
 */
export function notifyStaffTelegram(opts) {
  if (!enabled()) return
  const conversationId = opts.conversationId
  if (!conversationId) return

  const now = Date.now()
  let entry = debounceByConv.get(conversationId)

  if (entry && now - entry.at < DEBOUNCE_MS) {
    entry.skipped += 1
    entry.last = opts
    if (entry.timer) clearTimeout(entry.timer)
    entry.timer = setTimeout(() => {
      const e = debounceByConv.get(conversationId)
      if (!e?.last) return
      const skipped = e.skipped
      e.at = Date.now()
      e.skipped = 0
      e.timer = null
      void sendNow({ ...e.last, extraCount: skipped }).catch((err) => {
        console.warn('[telegram] notify failed:', err.message || err)
      })
    }, Math.max(0, DEBOUNCE_MS - (now - entry.at)))
    return
  }

  debounceByConv.set(conversationId, {
    at: now,
    skipped: 0,
    last: opts,
    timer: null,
  })

  void sendNow({ ...opts, extraCount: 0 }).catch((err) => {
    console.warn('[telegram] notify failed:', err.message || err)
  })
}
