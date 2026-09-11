/**
 * Dump recent guest chat messages to spot spam / scanner noise.
 * Usage (on VPS):
 *   cd /root/robustino-api && node --env-file=.env scripts/inspect-chat-noise.mjs
 */
import { query } from '../src/db.js'

const days = Number(process.argv[2] || 14)

const { rows: messages } = await query(
  `
  SELECT m.id,
         m.created_at,
         left(m.body, 300) AS body,
         length(m.body) AS body_len,
         c.id AS conversation_id,
         c.visitor_label,
         c.page_url,
         left(c.guest_token::text, 8) AS token_prefix,
         (
           SELECT COUNT(*)::int FROM site_chat_messages m2
           WHERE m2.conversation_id = c.id AND m2.deleted_at IS NULL
         ) AS msg_count
  FROM site_chat_messages m
  JOIN site_chat_conversations c ON c.id = m.conversation_id
  WHERE m.author_role = 'CUSTOMER'
    AND m.deleted_at IS NULL
    AND m.created_at > NOW() - ($1::int * INTERVAL '1 day')
  ORDER BY m.created_at DESC
  LIMIT 80
  `,
  [days]
)

const { rows: byDay } = await query(
  `
  SELECT date_trunc('day', created_at) AS day, COUNT(*)::int AS n
  FROM site_chat_messages
  WHERE author_role = 'CUSTOMER'
    AND deleted_at IS NULL
    AND created_at > NOW() - ($1::int * INTERVAL '1 day')
  GROUP BY 1
  ORDER BY 1 DESC
  `,
  [days]
)

console.log('=== guest messages per day (last', days, 'days) ===')
console.table(byDay.map((r) => ({ day: r.day?.toISOString?.()?.slice(0, 10) || r.day, n: r.n })))

console.log('\n=== latest guest messages ===')
for (const m of messages) {
  const bodyPreview = JSON.stringify(m.body)
  console.log(
    [
      m.created_at?.toISOString?.() || m.created_at,
      `conv=${String(m.conversation_id).slice(0, 8)}`,
      `msgs=${m.msg_count}`,
      `label=${JSON.stringify(m.visitor_label || '')}`,
      `page=${m.page_url || '—'}`,
      `len=${m.body_len}`,
      bodyPreview,
    ].join(' | ')
  )
}

process.exit(0)
