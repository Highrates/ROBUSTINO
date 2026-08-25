import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '@store/authStore'
import { apiFetch } from '@/utils/http'
import { SITE_CHAT_ADMIN_UNREAD_POLL_MS } from '@shared/siteChatLimits.js'

const AdminLayout = ({ children }) => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [chatUnread, setChatUnread] = useState(0)
  const titleBaseRef = useRef(
    typeof document !== 'undefined' ? document.title.replace(/^\(\d+\+?\)\s*/, '') : 'ROBUSTINO Admin'
  )

  const refreshChatUnread = useCallback(async () => {
    try {
      const data = await apiFetch('/chat/admin/unread-count')
      setChatUnread(Number(data?.count) || 0)
    } catch {
      /* ignore — e.g. session expired handled elsewhere */
    }
  }, [])

  useEffect(() => {
    void refreshChatUnread()
    const id = setInterval(() => void refreshChatUnread(), SITE_CHAT_ADMIN_UNREAD_POLL_MS)
    const onBump = () => void refreshChatUnread()
    window.addEventListener('robustino-admin-chat-unread', onBump)
    return () => {
      clearInterval(id)
      window.removeEventListener('robustino-admin-chat-unread', onBump)
    }
  }, [refreshChatUnread])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const base = titleBaseRef.current || 'ROBUSTINO Admin'
    if (chatUnread > 0) {
      document.title = `(${chatUnread > 99 ? '99+' : chatUnread}) ${base}`
    } else {
      document.title = base
    }
    return () => {
      document.title = base
    }
  }, [chatUnread])

  const handleLogout = async () => {
    if (window.confirm('Вы уверены, что хотите выйти?')) {
      await logout()
      navigate('/admin/login', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container-custom mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link to="/admin" className="text-xl font-bold text-gray-900">
                ROBUSTINO Admin
              </Link>
              <nav className="hidden md:flex space-x-4">
                <Link
                  to="/admin"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition"
                >
                  Dashboard
                </Link>
                <Link
                  to="/admin/products"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition"
                >
                  Товары
                </Link>
                <Link
                  to="/admin/articles"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition"
                >
                  Статьи
                </Link>
                <Link
                  to="/admin/projects"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition"
                >
                  Проекты
                </Link>
                <Link
                  to="/admin/faq"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition"
                >
                  FAQ
                </Link>
                <Link
                  to="/admin/faq-links"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition"
                >
                  Ссылки FAQ
                </Link>
                <Link
                  to="/admin/presentation"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition"
                >
                  Презентация
                </Link>
                <Link
                  to="/admin/chat"
                  className="relative text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition"
                  onClick={() => setTimeout(() => void refreshChatUnread(), 800)}
                >
                  Чат
                  {chatUnread > 0 ? (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-rose-600 text-white text-[10px] leading-[1.15rem] text-center font-semibold">
                      {chatUnread > 9 ? '9+' : chatUnread}
                    </span>
                  ) : null}
                </Link>
                <Link
                  to="/admin/upholstery"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition"
                >
                  Обивки
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden sm:block">
                {user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-custom mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}

export default AdminLayout
