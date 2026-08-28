import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { METRIKA_ID } from '@/utils/yandexMetrika'

/**
 * Отправляет hit в Яндекс.Метрику при клиентских переходах SPA.
 * Админку не учитываем.
 */
const YandexMetrika = () => {
  const location = useLocation()

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return
    if (typeof window.ym !== 'function') return

    window.ym(METRIKA_ID, 'hit', window.location.href)
  }, [location.pathname, location.search])

  return null
}

export default YandexMetrika
