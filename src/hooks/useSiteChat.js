import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/utils/http'
import { trackChatMessage } from '@/utils/yandexMetrika'
import { useChatAttachments } from '@/hooks/useChatAttachments'
import {
  SITE_CHAT_ADMIN_UPLOAD_MAX_BYTES,
  SITE_CHAT_GUEST_UPLOAD_MAX_BYTES,
  SITE_CHAT_MESSAGES_PAGE_DEFAULT,
  SITE_CHAT_POLL_MS,
  SITE_CHAT_STAFF_AVATAR_URL,
  formatUploadMaxLabel,
} from '@shared/siteChatLimits.js'

function formatTimeLabel(iso, locale = 'ru-RU') {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  return new Date(t).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

function mapApiMessageToUi(m, { selfRole }) {
  const attachments = m.attachments || []
  const images = attachments
    .filter((a) => a.kind === 'IMAGE')
    .map((a) => ({ id: a.id, src: a.fileUrl, alt: a.filename }))
  const documents = attachments
    .filter((a) => a.kind === 'FILE')
    .map((a) => ({ id: a.id, filename: a.filename, url: a.fileUrl }))

  const isSelf = m.authorRole === selfRole
  const staffAvatar =
    m.authorRole === 'STAFF' ? m.authorAvatarUrl || SITE_CHAT_STAFF_AVATAR_URL : null

  return {
    id: m.id,
    senderName: isSelf ? 'Вы' : m.authorLabel === 'Вы' && m.authorRole === 'GUEST' ? 'Посетитель' : m.authorLabel,
    senderAvatarUrl: isSelf ? null : staffAvatar,
    timeLabel: formatTimeLabel(m.createdAt),
    content: m.deletedAt ? '' : m.body,
    documents,
    images,
    isDeleted: Boolean(m.deletedAt),
    ocAuthorRole: m.authorRole,
    ocCreatedAtIso: m.createdAt,
  }
}

/**
 * @param {{
 *   enabled: boolean
 *   variant: 'guest' | 'admin'
 *   conversationId?: string | null
 *   visitorLabel?: string
 * }} opts
 */
export function useSiteChat({ enabled, variant, conversationId = null, visitorLabel = '' }) {
  const isAdmin = variant === 'admin'
  const [messages, setMessages] = useState([])
  const [conversationIdState, setConversationIdState] = useState(null)
  const [hasOlder, setHasOlder] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const pollRef = useRef(null)
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  const visitorLabelRef = useRef(visitorLabel)
  visitorLabelRef.current = visitorLabel

  const basePath = isAdmin
    ? conversationId
      ? `/chat/admin/${conversationId}`
      : null
    : '/chat'

  const maxFileBytes = isAdmin ? SITE_CHAT_ADMIN_UPLOAD_MAX_BYTES : SITE_CHAT_GUEST_UPLOAD_MAX_BYTES

  const uploadFile = useCallback(
    async (file) => {
      if (!basePath) throw new Error('Нет диалога')
      const fd = new FormData()
      fd.append('file', file)
      return apiFetch(`${basePath}/upload`, { method: 'POST', formData: fd })
    },
    [basePath]
  )

  const attachments = useChatAttachments({
    enabled: enabled && Boolean(basePath),
    uploadFile,
    onError: setError,
    maxFileBytes,
    fileTooLargeMessage: formatUploadMaxLabel(maxFileBytes),
  })

  const mapSelf = useCallback(
    (m) => mapApiMessageToUi(m, { selfRole: isAdmin ? 'STAFF' : 'CUSTOMER' }),
    [isAdmin]
  )

  const fetchMessages = useCallback(
    async ({ before, after, silent } = {}) => {
      if (!basePath) return { appended: 0 }
      if (!silent) setLoading(true)
      try {
        const q = new URLSearchParams({ limit: String(SITE_CHAT_MESSAGES_PAGE_DEFAULT) })
        if (before) q.set('before', before)
        if (after) q.set('after', after)
        const data = await apiFetch(`${basePath}/messages?${q}`, {
          skipAuthHandler: !isAdmin,
        })
        if (data.conversationId) setConversationIdState(data.conversationId)
        const mapped = (data.messages || []).map(mapSelf)
        let appended = 0
        if (after) {
          setMessages((prev) => {
            const seen = new Set(prev.map((x) => x.id))
            const extra = mapped.filter((x) => !seen.has(x.id))
            appended = extra.length
            return extra.length ? [...prev, ...extra] : prev
          })
        } else if (before) {
          setMessages((prev) => {
            const seen = new Set(prev.map((x) => x.id))
            const prepended = mapped.filter((x) => !seen.has(x.id))
            return [...prepended, ...prev]
          })
          setHasOlder(Boolean(data.hasOlder))
        } else {
          const wasEmpty = messagesRef.current.length === 0
          setMessages(mapped)
          setHasOlder(Boolean(data.hasOlder))
          // Full reload: only count as "new" when going empty → non-empty (avoid markRead every poll)
          appended = wasEmpty && mapped.length > 0 ? mapped.length : 0
        }
        setError(null)
        return { appended }
      } catch (e) {
        if (!silent) setError(e.message || 'Не удалось загрузить чат')
        return { appended: 0 }
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [basePath, isAdmin, mapSelf]
  )

  const markRead = useCallback(async () => {
    if (!basePath) return
    try {
      await apiFetch(`${basePath}/read`, { method: 'POST', skipAuthHandler: !isAdmin })
      if (isAdmin && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('robustino-admin-chat-unread'))
      }
    } catch {
      /* ignore */
    }
  }, [basePath, isAdmin])

  useEffect(() => {
    if (!enabled || !basePath) {
      setMessages([])
      setHasOlder(false)
      setConversationIdState(null)
      attachments.clearPendingAttachments()
      return
    }
    void (async () => {
      await fetchMessages()
      await markRead()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on open/conversation
  }, [enabled, basePath])

  useEffect(() => {
    if (!enabled || !basePath) return
    const tick = async () => {
      const list = messagesRef.current
      const tailId = list.length ? list[list.length - 1].id : null
      if (tailId) {
        const { appended } = await fetchMessages({ after: tailId, silent: true })
        if (appended > 0) await markRead()
      } else {
        const { appended } = await fetchMessages({ silent: true })
        if (appended > 0) await markRead()
      }
    }
    pollRef.current = setInterval(() => void tick(), SITE_CHAT_POLL_MS)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [enabled, basePath, fetchMessages, markRead])

  const loadOlder = useCallback(async () => {
    if (!hasOlder || loadingOlder || !messages.length) return
    setLoadingOlder(true)
    try {
      await fetchMessages({ before: messages[0].id, silent: true })
    } finally {
      setLoadingOlder(false)
    }
  }, [fetchMessages, hasOlder, loadingOlder, messages])

  const send = useCallback(
    async (text) => {
      if (!basePath || sending || attachments.uploadBusy) return
      const ready = attachments.getReadyAttachments()
      const body = String(text || '').trim()
      if (!body && !ready.length) return
      setSending(true)
      setError(null)
      try {
        const payload = {
          body,
          attachments: ready.map((r) => ({
            fileUrl: r.fileUrl,
            filename: r.filename,
            mimeType: r.mimeType,
            kind: r.kind,
          })),
        }
        const label = String(visitorLabelRef.current || '').trim()
        if (label) payload.visitorLabel = label
        if (!isAdmin && typeof window !== 'undefined') {
          payload.pageUrl = window.location.href
        }
        const created = await apiFetch(`${basePath}/messages`, {
          method: 'POST',
          body: payload,
          skipAuthHandler: !isAdmin,
        })
        const ui = mapSelf(created)
        setMessages((prev) => (prev.some((m) => m.id === ui.id) ? prev : [...prev, ui]))
        if (created.conversationId) setConversationIdState(created.conversationId)
        attachments.clearPendingAttachments()
        if (!isAdmin) {
          trackChatMessage({ hasText: Boolean(body), hasAttachments: ready.length > 0 })
        }
        await markRead()
      } catch (e) {
        setError(e.message || 'Не удалось отправить')
      } finally {
        setSending(false)
      }
    },
    [attachments, basePath, isAdmin, mapSelf, markRead, sending]
  )

  return {
    conversationId: conversationIdState || conversationId,
    chatMessages: messages,
    chatError: error,
    chatLoading: loading,
    chatSending: sending || attachments.uploadBusy,
    hasOlderHistory: hasOlder,
    loadingOlderHistory: loadingOlder,
    loadOlderChatMessages: loadOlder,
    sendChatMessage: send,
    pendingOutgoing: attachments.pendingOutgoingAttachments,
    pendingAttachmentsHint: attachments.pendingAttachmentsHint,
    canSendAttachmentMessage: attachments.canSendAttachmentMessage,
    attachChatFiles: attachments.attachChatFiles,
    removePendingChatAttachment: attachments.removePendingChatAttachment,
    refresh: () => fetchMessages({ silent: true }),
  }
}
