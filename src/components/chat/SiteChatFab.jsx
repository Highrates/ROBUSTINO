import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ChatWindow } from '@components/chat/ChatWindow'
import { useSiteChat } from '@/hooks/useSiteChat'
import { apiFetch } from '@/utils/http'
import { SITE_CHAT_VISITOR_LABEL_MAX } from '@shared/siteChatLimits.js'
import styles from './SiteChatFab.module.css'

const NAME_KEY = 'robustino_chat_visitor_name'
const TITLE_BASE = 'ROBUSTINO'

export default function SiteChatFab() {
  const location = useLocation()
  const isAdminPath = location.pathname.startsWith('/admin')
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const titleBaseRef = useRef(
    typeof document !== 'undefined' ? document.title || TITLE_BASE : TITLE_BASE
  )
  const [visitorName, setVisitorName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) || ''
    } catch {
      return ''
    }
  })

  const chat = useSiteChat({
    enabled: open && !isAdminPath,
    variant: 'guest',
    visitorLabel: visitorName,
  })

  const refreshUnread = useCallback(async () => {
    if (isAdminPath || open) return
    try {
      const data = await apiFetch('/chat/unread-count', { skipAuthHandler: true })
      setUnread(Number(data?.count) || 0)
    } catch {
      /* ignore */
    }
  }, [isAdminPath, open])

  useEffect(() => {
    if (isAdminPath) return
    void refreshUnread()
    const id = setInterval(() => void refreshUnread(), 15000)
    return () => clearInterval(id)
  }, [isAdminPath, refreshUnread])

  useEffect(() => {
    if (open) setUnread(0)
  }, [open])

  useEffect(() => {
    if (typeof document === 'undefined' || isAdminPath) return
    const base = titleBaseRef.current.replace(/^\(\d+\+?\)\s*/, '') || TITLE_BASE
    titleBaseRef.current = base
    if (!open && unread > 0) {
      document.title = `(${unread > 99 ? '99+' : unread}) ${base}`
    } else {
      document.title = base
    }
    return () => {
      document.title = base
    }
  }, [unread, open, isAdminPath])

  useEffect(() => {
    const openChat = () => setOpen(true)
    window.addEventListener('robustino-open-site-chat', openChat)
    return () => window.removeEventListener('robustino-open-site-chat', openChat)
  }, [])

  const onNameChange = (value) => {
    const next = value.slice(0, SITE_CHAT_VISITOR_LABEL_MAX)
    setVisitorName(next)
    try {
      localStorage.setItem(NAME_KEY, next)
    } catch {
      /* ignore */
    }
  }

  if (isAdminPath) return null

  const showNameField = open && chat.chatMessages.length === 0

  return (
    <>
      {!open ? (
        <button
          type="button"
          className={styles.fab}
          onClick={() => setOpen(true)}
          aria-label={unread > 0 ? `Открыть чат, непрочитанных: ${unread}` : 'Открыть чат'}
        >
          <img src="/icons/chat-fab.svg" alt="" width={22} height={22} className={styles.fabIcon} />
          {unread > 0 ? (
            <span className={styles.badge} aria-hidden>
              {unread > 99 ? '99+' : unread}
            </span>
          ) : null}
        </button>
      ) : null}

      <ChatWindow
        open={open}
        onClose={() => setOpen(false)}
        title="Чат с ROBUSTINO"
        headerPresence={{ label: 'Менеджер ROBUSTINO', status: 'Онлайн' }}
        messages={chat.chatMessages}
        onSend={chat.sendChatMessage}
        variant="portal"
        errorText={chat.chatError}
        composerDisabled={chat.chatSending}
        attachmentsEnabled
        pendingOutgoing={chat.pendingOutgoing}
        pendingAttachmentsHint={chat.pendingAttachmentsHint}
        allowEmptySend={chat.canSendAttachmentMessage}
        onAttachFiles={chat.attachChatFiles}
        onRemovePendingAttachment={chat.removePendingChatAttachment}
        hasOlderHistory={chat.hasOlderHistory}
        loadingOlderHistory={chat.loadingOlderHistory}
        onLoadOlderHistory={chat.loadOlderChatMessages}
        messageEmptyHint={
          chat.chatLoading
            ? 'Загрузка…'
            : 'Менеджер онлайн — напишите, ответим как можно скорее'
        }
        inputPlaceholder="Ваше сообщение"
        composerBanner={
          showNameField ? (
            <label className={styles.nameField}>
              <span className={styles.nameLabel}>Как к вам обращаться</span>
              <input
                type="text"
                className={styles.nameInput}
                value={visitorName}
                maxLength={SITE_CHAT_VISITOR_LABEL_MAX}
                placeholder="Имя или компания"
                onChange={(e) => onNameChange(e.target.value)}
                autoComplete="name"
              />
            </label>
          ) : null
        }
      />
    </>
  )
}
