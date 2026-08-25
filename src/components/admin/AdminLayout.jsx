import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import useAuthStore from '@store/authStore'
import { apiFetch } from '@/utils/http'
import { SITE_CHAT_ADMIN_UNREAD_POLL_MS } from '@shared/siteChatLimits.js'

const PRIMARY_LINKS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/products', label: 'Товары' },
  { to: '/admin/projects', label: 'Проекты' },
  { to: '/admin/chat', label: 'Чат', badge: 'chat' },
]

const MORE_LINKS = [
  { to: '/admin/articles', label: 'Статьи' },
  { to: '/admin/faq', label: 'FAQ' },
  { to: '/admin/faq-links', label: 'Ссылки FAQ' },
  { to: '/admin/presentation', label: 'Презентация' },
  { to: '/admin/upholstery', label: 'Обивки' },
  { to: '/admin/collections', label: 'Коллекции' },
  { to: '/admin/settings', label: 'Настройки' },
]

const ALL_MOBILE_LINKS = [...PRIMARY_LINKS, ...MORE_LINKS]

const linkClass = ({ isActive }) =>
  [
    'px-2.5 py-2 rounded-md text-sm font-medium transition whitespace-nowrap',
    isActive ? 'text-gray-900 bg-gray-100' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
  ].join(' ')

const AdminLayout = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [chatUnread, setChatUnread] = useState(0)
  const [moreOpen, setMoreOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const moreRef = useRef(null)
  const titleBaseRef = useRef(
    typeof document !== 'undefined' ? document.title.replace(/^\(\d+\+?\)\s*/, '') : 'ROBUSTINO Admin'
  )

  const refreshChatUnread = useCallback(async () => {
    try {
      const data = await apiFetch('/chat/admin/unread-count')
      setChatUnread(Number(data?.count) || 0)
    } catch {
      /* ignore */
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

  useEffect(() => {
    setMoreOpen(false)
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!moreOpen) return
    const onDoc = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [moreOpen])

  const moreActive = MORE_LINKS.some(
    (l) => location.pathname === l.to || location.pathname.startsWith(`${l.to}/`)
  )

  const handleLogout = async () => {
    if (window.confirm('Вы уверены, что хотите выйти?')) {
      await logout()
      navigate('/admin/login', { replace: true })
    }
  }

  const renderNavLink = (item, { onNavigate } = {}) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      className={linkClass}
      onClick={() => {
        if (item.badge === 'chat') setTimeout(() => void refreshChatUnread(), 800)
        onNavigate?.()
      }}
    >
      <span className="relative inline-flex items-center gap-1">
        {item.label}
        {item.badge === 'chat' && chatUnread > 0 ? (
          <span className="min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-rose-600 text-white text-[10px] leading-[1.15rem] text-center font-semibold">
            {chatUnread > 9 ? '9+' : chatUnread}
          </span>
        ) : null}
      </span>
    </NavLink>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container-custom mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <Link to="/admin" className="text-lg font-bold text-gray-900 shrink-0">
                ROBUSTINO
              </Link>

              <nav className="hidden lg:flex items-center gap-0.5">
                {PRIMARY_LINKS.map((item) => renderNavLink(item))}

                <div className="relative" ref={moreRef}>
                  <button
                    type="button"
                    className={[
                      'px-2.5 py-2 rounded-md text-sm font-medium transition whitespace-nowrap',
                      moreOpen || moreActive
                        ? 'text-gray-900 bg-gray-100'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
                    ].join(' ')}
                    aria-expanded={moreOpen}
                    aria-haspopup="menu"
                    onClick={() => setMoreOpen((v) => !v)}
                  >
                    Ещё ▾
                  </button>
                  {moreOpen ? (
                    <div
                      role="menu"
                      className="absolute left-0 top-full mt-1 z-40 min-w-[11rem] rounded-md border border-gray-200 bg-white py-1 shadow-lg"
                    >
                      {MORE_LINKS.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          role="menuitem"
                          className={({ isActive }) =>
                            [
                              'block px-3 py-2 text-sm transition',
                              isActive
                                ? 'bg-gray-100 text-gray-900 font-medium'
                                : 'text-gray-700 hover:bg-gray-50',
                            ].join(' ')
                          }
                        >
                          {item.label}
                        </NavLink>
                      ))}
                    </div>
                  ) : null}
                </div>
              </nav>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm text-gray-600 hidden md:block max-w-[12rem] truncate">
                {user?.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition"
              >
                Выйти
              </button>
              <button
                type="button"
                className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
                aria-label={mobileOpen ? 'Закрыть меню' : 'Открыть меню'}
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((v) => !v)}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  {mobileOpen ? (
                    <path
                      d="M6 6l12 12M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                  ) : (
                    <path
                      d="M4 7h16M4 12h16M4 17h16"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {mobileOpen ? (
            <nav className="lg:hidden mt-3 pt-3 border-t border-gray-100 flex flex-col gap-0.5 pb-1">
              {ALL_MOBILE_LINKS.map((item) =>
                renderNavLink(item, { onNavigate: () => setMobileOpen(false) })
              )}
            </nav>
          ) : null}
        </div>
      </header>

      <main className="container-custom mx-auto px-4 py-8">{children}</main>
    </div>
  )
}

export default AdminLayout
