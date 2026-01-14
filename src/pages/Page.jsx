import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import useFAQLinksStore from '@store/faqLinksStore'
import Header from '@components/common/Header'
import Footer from '@components/common/Footer'

const Page = () => {
  const { id } = useParams()
  const { fetchFAQLink, currentLink, loading, error } = useFAQLinksStore()

  // Скроллим вверх при монтировании страницы
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    // Дополнительно на случай, если первый вызов не сработал
    const timeoutId = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [])

  useEffect(() => {
    if (id) {
      fetchFAQLink(id)
    }
  }, [id, fetchFAQLink])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка страницы...</p>
        </div>
      </div>
    )
  }

  if (error || !currentLink) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Страница не найдена</h1>
          <Link to="/" className="text-blue-600 hover:text-blue-800">
            Вернуться на главную
          </Link>
        </div>
      </div>
    )
  }

  if (!currentLink.is_internal_page) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Страница недоступна</h1>
          <Link to="/" className="text-blue-600 hover:text-blue-800">
            Вернуться на главную
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-main-bg">
        <div className="padding-global">
          <div className="container-large">
            <div className="py-16">
              <h1 className="text-4xl font-bold text-gray-900 mb-8">{currentLink.name}</h1>
              {currentLink.page_content && (
                <div 
                  className="prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: currentLink.page_content }}
                />
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default Page
