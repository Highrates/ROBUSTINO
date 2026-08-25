import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AdminLayout from '@components/admin/AdminLayout'
import { ChatWindow } from '@components/chat/ChatWindow'
import { useSiteChat } from '@/hooks/useSiteChat'
import { apiFetch } from '@/utils/http'

function formatWhen(iso) {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  return new Date(t).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminChat() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(() => searchParams.get('c') || null)

  const loadList = useCallback(async () => {
    try {
      const data = await apiFetch('/chat/admin/conversations')
      setList(Array.isArray(data) ? data : [])
      setError(null)
    } catch (e) {
      setError(e.message || 'Не удалось загрузить диалоги')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadList()
    const id = setInterval(() => void loadList(), 8000)
    return () => clearInterval(id)
  }, [loadList])

  useEffect(() => {
    const fromUrl = searchParams.get('c')
    if (fromUrl && fromUrl !== selectedId) setSelectedId(fromUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once from URL / when ?c= changes
  }, [searchParams])

  useEffect(() => {
    const cur = searchParams.get('c')
    if (selectedId && cur !== selectedId) {
      setSearchParams({ c: selectedId }, { replace: true })
    } else if (!selectedId && cur) {
      setSearchParams({}, { replace: true })
    }
  }, [selectedId, searchParams, setSearchParams])

  const chat = useSiteChat({
    enabled: Boolean(selectedId),
    variant: 'admin',
    conversationId: selectedId,
  })

  useEffect(() => {
    if (!selectedId) return
    void loadList()
  }, [selectedId, chat.chatMessages.length, loadList])

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Чат с сайтом</h1>
        <p className="text-sm text-gray-500 mt-1">
          Сообщения посетителей с плавающей кнопки на сайте
        </p>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-4 min-h-[70vh]">
        <aside className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col max-h-[70vh]">
          <div className="px-4 py-3 border-b border-gray-100 text-sm font-medium text-gray-700">
            Диалоги
          </div>
          <div className="overflow-y-auto flex-1">
            {loading && !list.length ? (
              <p className="p-4 text-sm text-gray-500">Загрузка…</p>
            ) : null}
            {!loading && !list.length ? (
              <p className="p-4 text-sm text-gray-500">Пока нет обращений</p>
            ) : null}
            <ul>
              {list.map((c) => {
                const active = c.id === selectedId
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-50 transition ${
                        active ? 'bg-gray-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {c.visitorLabel}
                        </span>
                        {c.unreadCount > 0 ? (
                          <span className="shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-rose-600 text-white text-[11px] leading-5 text-center">
                            {c.unreadCount}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{c.lastBody || '—'}</p>
                      {c.pageUrl ? (
                        <a
                          href={c.pageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-blue-600 hover:underline mt-1 block truncate"
                          onClick={(e) => e.stopPropagation()}
                          title={c.pageUrl}
                        >
                          {(() => {
                            try {
                              const u = new URL(c.pageUrl)
                              return u.pathname + u.search || c.pageUrl
                            } catch {
                              return c.pageUrl
                            }
                          })()}
                        </a>
                      ) : null}
                      <p className="text-[11px] text-gray-400 mt-1">{formatWhen(c.lastMessageAt)}</p>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </aside>

        <section className="bg-white border border-gray-200 rounded-lg min-h-[520px] h-[70vh] overflow-hidden relative">
          {selectedId ? (
            <ChatWindow
              open
              onClose={() => setSelectedId(null)}
              title="Переписка"
              messages={chat.chatMessages}
              onSend={chat.sendChatMessage}
              variant="embedded"
              embeddedLayout="fill"
              hideCloseButton
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
              messageEmptyHint={chat.chatLoading ? 'Загрузка…' : 'Нет сообщений'}
              titleTransform="none"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-gray-500">
              Выберите диалог слева
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  )
}
