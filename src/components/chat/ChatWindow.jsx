import { createPortal } from 'react-dom'
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  formatChatDaySeparatorLabel,
  chatLocalDayKey,
} from '@/utils/chatDaySeparator'
import styles from './ChatWindow.module.css'

function escapeAttrSelectorSegment(value) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value)
  }
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M5 5L15 15M15 5L5 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MessageBetweenDivider() {
  return (
    <div className={styles.dividerWrap} aria-hidden>
      <div className={styles.dividerLine} />
    </div>
  )
}

function DaySeparatorRibbon({ iso, locale }) {
  const label = formatChatDaySeparatorLabel(iso, locale)
  if (!label.trim()) return null
  return (
    <div className={styles.daySeparatorWrap}>
      <p className={styles.daySeparatorText}>{label}</p>
    </div>
  )
}

function SendDirectIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 33 33" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M17.0717 8.42582L6.29151 15.8639C3.73132 17.6275 4.94006 21.6355 8.04765 21.6936L11.6694 21.7614C12.6755 21.7802 13.6146 22.2719 14.2031 23.0881L16.322 26.0261C18.14 28.5471 22.1138 27.2527 22.1138 24.1485L22.086 11.0513C22.0805 8.4748 19.1924 6.9626 17.0717 8.42582Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MessageAttachments({ message, onOpenChatImage }) {
  const docs = message.documents ?? []
  const imgs = message.images ?? []
  if (docs.length === 0 && imgs.length === 0) return null

  const singleImage = imgs.length === 1

  return (
    <div className={styles.messageAttachments}>
      {docs.length > 0 ? (
        <div className={styles.docRow}>
          {docs.map((d) =>
            d.url ? (
              <a
                key={d.id}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className={styles.docChip}
                title={d.filename}
              >
                <img className={styles.docChipIcon} src="/icons/doc.svg" alt="" width={16} height={16} />
                <span className={styles.docChipName}>{d.filename}</span>
              </a>
            ) : (
              <div key={d.id} className={styles.docChip} title={d.filename}>
                <img className={styles.docChipIcon} src="/icons/doc.svg" alt="" width={16} height={16} />
                <span className={styles.docChipName}>{d.filename}</span>
              </div>
            )
          )}
        </div>
      ) : null}
      {imgs.length > 0 ? (
        <div className={singleImage ? styles.imgRowSingle : styles.imgRow}>
          {imgs.map((im, idx) => (
            <button
              key={im.id}
              type="button"
              className={styles.imgThumbBtn}
              onClick={() => onOpenChatImage(imgs, idx)}
              aria-label="Открыть изображение"
            >
              <img
                className={singleImage ? styles.imgThumbSingle : styles.imgThumb}
                src={im.src}
                alt={im.alt ?? ''}
                loading="lazy"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function ChatWindow({
  open,
  onClose,
  title,
  messages = [],
  onSend,
  variant = 'portal',
  embeddedLayout = 'fill',
  hideCloseButton = false,
  messageEmptyHint = 'Пока нет сообщений',
  inputPlaceholder = 'Сообщение',
  errorText = null,
  composerDisabled = false,
  attachPickerDisabled,
  attachmentsEnabled = false,
  pendingAttachmentsHint = null,
  composerBanner = null,
  pendingOutgoing = [],
  allowEmptySend = false,
  onAttachFiles,
  onRemovePendingAttachment,
  hasOlderHistory = false,
  loadingOlderHistory = false,
  onLoadOlderHistory,
  loadOlderHistoryLabel = 'Показать раньше',
  messageDayLocale = 'ru-RU',
  titleTransform = 'uppercase',
  /** @type {{ label: string, status: string } | null} */
  headerPresence = null,
}) {
  const embedded = variant === 'embedded'
  const titleId = useId()
  const fileInputId = useId()
  const textareaRef = useRef(null)
  const messagesScrollRef = useRef(null)
  const panelRef = useRef(null)
  const [draft, setDraft] = useState('')
  const [blendReady, setBlendReady] = useState(embedded)
  const [lightbox, setLightbox] = useState(null)

  const scrollMessagesToBottom = useCallback(() => {
    const el = messagesScrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [])

  const listStatsRef = useRef({ length: 0 })

  useLayoutEffect(() => {
    if (!open) {
      listStatsRef.current = { length: 0 }
      return
    }

    const el = messagesScrollRef.current
    if (!el) return

    const prev = listStatsRef.current
    const headId = messages[0]?.id
    const tailId = messages.length ? messages[messages.length - 1].id : undefined

    let raf0 = 0
    let raf1 = 0
    const bumpBottomWithRafs = () => {
      scrollMessagesToBottom()
      raf0 = requestAnimationFrame(() => {
        scrollMessagesToBottom()
        raf1 = requestAnimationFrame(scrollMessagesToBottom)
      })
    }

    const prepend =
      prev.length > 0 &&
      messages.length > prev.length &&
      headId !== undefined &&
      headId !== prev.headId

    const append =
      prev.length > 0 &&
      messages.length > prev.length &&
      headId !== undefined &&
      headId === prev.headId &&
      tailId !== undefined &&
      prev.tailId !== undefined &&
      tailId !== prev.tailId

    const tailReload =
      prev.length > messages.length &&
      messages.length > 0 &&
      tailId !== undefined &&
      prev.tailId !== undefined &&
      tailId === prev.tailId &&
      headId !== undefined &&
      headId !== prev.headId

    const initialFill = prev.length === 0 && messages.length > 0

    if (prepend && prev.headId) {
      const keep = el.querySelector(`[data-oc-msg-id="${escapeAttrSelectorSegment(prev.headId)}"]`)
      if (keep instanceof HTMLElement) keep.scrollIntoView({ block: 'nearest' })
    } else if (initialFill || append || tailReload) {
      bumpBottomWithRafs()
    }

    listStatsRef.current = {
      length: messages.length,
      headId,
      tailId,
    }

    return () => {
      cancelAnimationFrame(raf0)
      cancelAnimationFrame(raf1)
    }
  }, [open, messages, scrollMessagesToBottom])

  const messagesFingerprint = useMemo(() => messages.map((m) => m.id).join('\0'), [messages])

  useEffect(() => {
    if (!open) return
    const root = messagesScrollRef.current
    if (!root) return

    const nearBottom = (px = 120) => root.scrollHeight - root.scrollTop - root.clientHeight <= px

    const maybeStickToBottom = () => {
      if (!nearBottom()) return
      root.scrollTop = root.scrollHeight
    }

    const ro = new ResizeObserver(() => {
      maybeStickToBottom()
    })
    ro.observe(root)

    let mo = null
    try {
      mo = new MutationObserver(() => maybeStickToBottom())
      mo.observe(root, { childList: true, subtree: true, characterData: true })
    } catch {
      mo = null
    }

    return () => {
      ro.disconnect()
      mo?.disconnect()
    }
  }, [open, messagesFingerprint])

  useEffect(() => {
    if (!open) {
      setBlendReady(false)
      return
    }
    if (embedded) {
      setBlendReady(true)
      return
    }
    setBlendReady(false)
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setBlendReady(true))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [open, embedded])

  useEffect(() => {
    if (!open || embedded) return

    const prevOverflow = document.body.style.overflow
    const prevPaddingRight = document.body.style.paddingRight
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`

    const root = panelRef.current
    const focusables = () => {
      if (!root) return []
      return Array.from(
        root.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el instanceof HTMLElement && el.offsetParent !== null)
    }

    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (lightbox) {
          e.preventDefault()
          setLightbox(null)
          return
        }
        onClose()
        return
      }
      if (e.key !== 'Tab' || !root) return
      const list = focusables()
      if (!list.length) return
      const first = list[0]
      const last = list[list.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    const t = window.setTimeout(() => {
      const list = focusables()
      const preferred = textareaRef.current || list[0]
      preferred?.focus?.()
    }, 30)

    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.paddingRight = prevPaddingRight
      document.removeEventListener('keydown', onKey)
      window.clearTimeout(t)
    }
  }, [open, onClose, embedded, lightbox])

  useEffect(() => {
    if (open) setDraft('')
  }, [open])

  const syncComposerHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = '0px'
    const maxPx = 192
    el.style.height = `${Math.min(el.scrollHeight, maxPx)}px`
  }, [])

  useLayoutEffect(() => {
    syncComposerHeight()
  }, [draft, open, syncComposerHeight])

  const submit = useCallback(() => {
    if (composerDisabled) return
    const t = draft.trim()
    if (!t && !allowEmptySend) return
    onSend?.(t)
    setDraft('')
  }, [draft, onSend, composerDisabled, allowEmptySend])

  const openChatImage = useCallback((images, index) => {
    const urls = images.map((i) => i.src.trim()).filter(Boolean)
    if (urls.length === 0) return
    setLightbox({
      urls,
      index: Math.max(0, Math.min(index, urls.length - 1)),
    })
  }, [])

  if (!open) return null

  const attachBlocked = attachPickerDisabled !== undefined ? attachPickerDisabled : composerDisabled

  const fillEmbedded = embedded && embeddedLayout === 'fill'
  const compactHeader = !title.trim() && hideCloseButton

  const lightboxNode =
    lightbox && typeof document !== 'undefined'
      ? createPortal(
          <div
            className={styles.lightbox}
            role="dialog"
            aria-modal="true"
            aria-label="Просмотр изображения"
            onClick={() => setLightbox(null)}
          >
            <button
              type="button"
              className={styles.lightboxClose}
              aria-label="Закрыть"
              onClick={() => setLightbox(null)}
            >
              <CloseIcon />
            </button>
            {lightbox.urls.length > 1 ? (
              <>
                <button
                  type="button"
                  className={styles.lightboxNavPrev}
                  aria-label="Предыдущее"
                  onClick={(e) => {
                    e.stopPropagation()
                    setLightbox((cur) =>
                      cur
                        ? {
                            ...cur,
                            index: (cur.index - 1 + cur.urls.length) % cur.urls.length,
                          }
                        : cur
                    )
                  }}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className={styles.lightboxNavNext}
                  aria-label="Следующее"
                  onClick={(e) => {
                    e.stopPropagation()
                    setLightbox((cur) =>
                      cur
                        ? { ...cur, index: (cur.index + 1) % cur.urls.length }
                        : cur
                    )
                  }}
                >
                  ›
                </button>
              </>
            ) : null}
            <img
              className={styles.lightboxImg}
              src={lightbox.urls[lightbox.index]}
              alt=""
              onClick={(e) => e.stopPropagation()}
            />
          </div>,
          document.body
        )
      : null

  const panelSection = (
    <section
      ref={panelRef}
      className={`${styles.panel} ${fillEmbedded ? styles.panelEmbedded : ''}`}
      {...(embedded
        ? { role: 'region' }
        : { role: 'dialog', 'aria-modal': true })}
      aria-labelledby={titleId}
    >
      <div className={styles.panelInner}>
        <header
          className={`${styles.header} ${compactHeader ? styles.headerCompact : ''} ${
            headerPresence ? styles.headerWithPresence : ''
          }`}
        >
          <div className={styles.headerMain}>
            <div className={styles.headerTitles}>
              <h2
                id={titleId}
                className={`${styles.title} ${titleTransform === 'none' ? styles.titleNormalCase : ''}`}
              >
                {title}
              </h2>
              {headerPresence ? (
                <p className={styles.presence}>
                  <span className={styles.presenceDot} aria-hidden />
                  <span className={styles.presenceLabel}>{headerPresence.label}</span>
                  <span className={styles.presenceSep} aria-hidden>
                    ·
                  </span>
                  <span className={styles.presenceStatus}>{headerPresence.status}</span>
                </p>
              ) : null}
            </div>
            {!hideCloseButton ? (
              <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрыть чат">
                <CloseIcon />
              </button>
            ) : null}
          </div>
          <div className={styles.headerMainRule} aria-hidden />
        </header>

        <div ref={messagesScrollRef} className={styles.messagesScroll}>
          {errorText ? (
            <p className={styles.chatErrorBanner} role="alert">
              {errorText}
            </p>
          ) : null}
          {messages.length === 0 ? <p className={styles.emptyHint}>{messageEmptyHint}</p> : null}
          {messages.length > 0 ? (
            <div className={styles.messagesList}>
              {hasOlderHistory && onLoadOlderHistory ? (
                <div className={styles.loadOlderWrap}>
                  <button
                    type="button"
                    className={styles.loadOlderBtn}
                    disabled={loadingOlderHistory}
                    onClick={() => void onLoadOlderHistory()}
                  >
                    {loadingOlderHistory ? `${loadOlderHistoryLabel}…` : loadOlderHistoryLabel}
                  </button>
                </div>
              ) : null}
              {messages.map((m, index) => {
                const iso = m.ocCreatedAtIso?.trim()
                const dayKey = iso ? chatLocalDayKey(iso) : null
                const prev = messages[index - 1]
                const prevIso = prev?.ocCreatedAtIso?.trim()
                const prevKey = prevIso ? chatLocalDayKey(prevIso) : null
                const showDaySep = iso && dayKey != null && (index === 0 || dayKey !== prevKey)

                const next = messages[index + 1]
                const nextIso = next?.ocCreatedAtIso?.trim()
                const nextKey = nextIso != null ? chatLocalDayKey(nextIso) : null
                const showBetweenDivider =
                  index < messages.length - 1 && dayKey != null && nextKey != null && dayKey === nextKey

                return (
                  <Fragment key={m.id}>
                    {showDaySep ? <DaySeparatorRibbon iso={iso} locale={messageDayLocale} /> : null}
                    <article className={styles.message} data-oc-msg-id={m.id}>
                      <div className={styles.senderInfo}>
                        <div className={styles.senderLeft}>
                          {m.senderAvatarUrl ? (
                            <img className={styles.avatar} src={m.senderAvatarUrl} alt="" width={24} height={24} />
                          ) : null}
                          <span className={styles.senderName}>{m.senderName}</span>
                          {m.headExtra ? (
                            <span className={styles.messageHeadExtra}>{m.headExtra}</span>
                          ) : null}
                        </div>
                        <span className={styles.messageTime}>{m.timeLabel}</span>
                      </div>
                      {!m.isDeleted &&
                      ((m.documents?.length ?? 0) > 0 || (m.images?.length ?? 0) > 0) ? (
                        <MessageAttachments message={m} onOpenChatImage={openChatImage} />
                      ) : null}
                      {m.isDeleted ? (
                        <p className={styles.messageDeleted}>Сообщение удалено</p>
                      ) : m.content?.trim() ? (
                        <p className={styles.messageBody}>{m.content.trim()}</p>
                      ) : null}
                      {m.footerSlot ? <div className={styles.messageFooter}>{m.footerSlot}</div> : null}
                    </article>
                    {showBetweenDivider ? <MessageBetweenDivider /> : null}
                  </Fragment>
                )
              })}
            </div>
          ) : null}
        </div>

        <footer className={styles.footer}>
          {pendingOutgoing.length > 0 ? (
            <div className={styles.pendingOutgoingStrip} aria-label="Вложения к отправке">
              {pendingOutgoing.map((a) => {
                const removeBtn = onRemovePendingAttachment ? (
                  <button
                    type="button"
                    className={styles.pendingOutgoingDocRemoveBtn}
                    aria-label={
                      a.kind === 'IMAGE' ? 'Убрать изображение' : `Убрать файл ${a.filename}`
                    }
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onRemovePendingAttachment(a.clientKey)
                    }}
                  >
                    <span className={styles.pendingOutgoingRemoveIcon} aria-hidden>
                      ×
                    </span>
                  </button>
                ) : null

                if (a.kind === 'IMAGE' && (a.imageSrc || a.uploading)) {
                  return (
                    <div key={a.clientKey} className={styles.pendingOutgoingImageChip} title={a.filename}>
                      <div className={styles.pendingOutgoingThumbWrap} aria-hidden>
                        {a.imageSrc ? (
                          <img
                            className={styles.pendingOutgoingThumb}
                            src={a.imageSrc}
                            alt=""
                            width={40}
                            height={40}
                          />
                        ) : null}
                        {a.uploading ? (
                          <div className={styles.pendingOutgoingUploadingOverlay}>
                            <span className={styles.pendingOutgoingSpinner} />
                          </div>
                        ) : null}
                      </div>
                      <span className={styles.pendingOutgoingDocName}>{a.filename}</span>
                      {a.uploading ? (
                        <span className={styles.pendingOutgoingDocSpinner} aria-label="Загрузка" />
                      ) : null}
                      {removeBtn}
                    </div>
                  )
                }

                return (
                  <div key={a.clientKey} className={styles.pendingOutgoingDoc} title={a.filename}>
                    <img className={styles.docChipIcon} src="/icons/doc.svg" alt="" width={16} height={16} />
                    <span className={styles.pendingOutgoingDocName}>{a.filename}</span>
                    {a.uploading ? (
                      <span className={styles.pendingOutgoingDocSpinner} aria-label="Загрузка" />
                    ) : null}
                    {removeBtn}
                  </div>
                )
              })}
            </div>
          ) : null}
          {pendingAttachmentsHint ? (
            <p className={styles.footerPendingHint}>{pendingAttachmentsHint}</p>
          ) : null}
          {composerBanner ? <div className={styles.composerBanner}>{composerBanner}</div> : null}
          <div className={styles.footerMainTopRule} aria-hidden />
          <div className={styles.footerMain}>
            <input
              id={fileInputId}
              type="file"
              className={styles.fileInputHidden}
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              tabIndex={-1}
              disabled={attachBlocked}
              aria-hidden
              onChange={(e) => {
                const input = e.target
                const files = input.files?.length ? Array.from(input.files) : []
                if (!files.length || !onAttachFiles) {
                  input.value = ''
                  return
                }
                queueMicrotask(() => {
                  void onAttachFiles(files)
                  input.value = ''
                })
              }}
            />
            {attachmentsEnabled ? (
              <label
                htmlFor={attachBlocked ? undefined : fileInputId}
                className={`${styles.attachBtn} ${attachBlocked ? styles.attachBtnBlocked : ''}`}
                aria-label="Прикрепить файл"
              >
                <img
                  src="/icons/attach.svg"
                  alt=""
                  className={styles.attachIcon}
                  width={22}
                  height={22}
                  draggable={false}
                />
              </label>
            ) : null}
            <textarea
              ref={textareaRef}
              rows={1}
              className={styles.input}
              placeholder={inputPlaceholder}
              value={draft}
              disabled={composerDisabled}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
              }}
              aria-label={inputPlaceholder}
            />
            <button
              type="button"
              className={styles.sendBtn}
              onClick={submit}
              disabled={composerDisabled}
              aria-label="Отправить"
            >
              <SendDirectIcon className={styles.sendIcon} />
            </button>
          </div>
        </footer>
      </div>
    </section>
  )

  if (embedded) {
    if (embeddedLayout === 'overlay') {
      return (
        <>
          <div
            className={`${styles.embedOverlayAnchor} ${blendReady ? styles.embedOverlayAnchorVisible : ''}`}
          >
            {panelSection}
          </div>
          {lightboxNode}
        </>
      )
    }
    return (
      <>
        <div className={`${styles.embedShell} ${blendReady ? styles.embedShellVisible : ''}`}>
          {panelSection}
        </div>
        {lightboxNode}
      </>
    )
  }

  if (typeof document === 'undefined') return null

  return (
    <>
      {createPortal(
        <div className={`${styles.root} ${blendReady ? styles.rootVisible : ''}`}>{panelSection}</div>,
        document.body
      )}
      {lightboxNode}
    </>
  )
}

export default ChatWindow
