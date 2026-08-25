#!/usr/bin/env node
/**
 * Print chat_id of users who messaged the bot (needed for TELEGRAM_CHAT_ID).
 * Usage (on VPS, with server/.env loaded):
 *   node --env-file=server/.env server/scripts/print-telegram-chat-id.mjs
 * Or: export TELEGRAM_BOT_TOKEN=... && node server/scripts/print-telegram-chat-id.mjs
 */
import 'dotenv/config'

const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
if (!token) {
  console.error('Set TELEGRAM_BOT_TOKEN first')
  process.exit(1)
}

const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=100`)
const data = await res.json()
if (!data.ok) {
  console.error('Telegram error:', data.description || data)
  process.exit(1)
}

const seen = new Map()
for (const u of data.result || []) {
  const msg = u.message || u.edited_message
  if (!msg?.chat) continue
  const chat = msg.chat
  const from = msg.from || {}
  const key = String(chat.id)
  if (seen.has(key)) continue
  seen.set(key, {
    chat_id: chat.id,
    username: from.username ? `@${from.username}` : '(no username)',
    name: [from.first_name, from.last_name].filter(Boolean).join(' ') || chat.title || '—',
  })
}

if (!seen.size) {
  console.log('Нет updates. Попросите получателя открыть бота и нажать Start, затем запустите снова.')
  process.exit(0)
}

console.log('Найденные чаты — скопируйте id через запятую в TELEGRAM_CHAT_ID:\n')
for (const row of seen.values()) {
  console.log(`  ${row.chat_id}  # ${row.username} · ${row.name}`)
}
if (seen.size > 1) {
  console.log(`\nПример: TELEGRAM_CHAT_ID=${[...seen.keys()].join(',')}`)
}
