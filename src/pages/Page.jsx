import { useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import useFAQLinksStore from '@store/faqLinksStore'
import Navbar from '@components/product/Navbar'
import Footer from '@components/common/Footer'
import Loader from '@components/common/Loader'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const Page = () => {
  const { id } = useParams()
  const { fetchFAQLink, currentLink, loading, error } = useFAQLinksStore()

  const pageSectionRef = useRef(null)
  const pageTitlesWrapRef = useRef(null)
  const pageContentRef = useRef(null)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
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

  // Анимация появления элементов страницы
  useEffect(() => {
    if (pageSectionRef.current && currentLink && !loading) {
      const titlesWrap = pageTitlesWrapRef.current
      const content = pageContentRef.current

      if (titlesWrap) {
        gsap.set(titlesWrap, { opacity: 0, y: 40 })
      }
      if (content) {
        gsap.set(content, { opacity: 0, y: 40 })
      }

      const timeoutId = setTimeout(() => {
        ScrollTrigger.refresh()

        if (titlesWrap) {
          gsap.to(titlesWrap, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            delay: 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: pageSectionRef.current,
              start: 'top 80%',
              toggleActions: 'play none none none'
            }
          })
        }

        if (content) {
          gsap.to(content, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            delay: 0.2,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: pageSectionRef.current,
              start: 'top 80%',
              toggleActions: 'play none none none'
            }
          })
        }
      }, 150)

      return () => clearTimeout(timeoutId)
    }
  }, [currentLink, loading])

  if (loading) {
    return (
      <div className="article-page relative bg-main-bg">
        <Navbar />
        <div className="flex justify-center items-center py-20">
          <Loader />
        </div>
        <Footer />
      </div>
    )
  }

  if (error || !currentLink) {
    return (
      <div className="article-page relative bg-main-bg">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-second-text text-lg mb-4">Страница не найдена</p>
          <Link to="/" className="text-main-text hover:text-second-text transition-colors">
            Вернуться на главную
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  if (!currentLink.is_internal_page) {
    return (
      <div className="article-page relative bg-main-bg">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-second-text text-lg mb-4">Страница недоступна</p>
          <Link to="/" className="text-main-text hover:text-second-text transition-colors">
            Вернуться на главную
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  const pageDate = currentLink.created_at
    ? new Date(currentLink.created_at).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : ''

  return (
    <div className="article-page relative bg-main-bg">
      <Navbar />

      <section ref={pageSectionRef} className="single-article-section">
        <div className="padding-global">
          <div className="container-large">
            <div className="single-article-content">
              <div ref={pageTitlesWrapRef} className="article-titles-wrap">
                {pageDate && (
                  <p className="second-title">
                    <span style={{ color: '#000000' }}>[ </span>
                    {pageDate}
                    <span style={{ color: '#000000' }}> ]</span>
                  </p>
                )}
                <div className="article-title-subtitle-wrap">
                  <h1 className="article-main-title">{currentLink.name}</h1>
                </div>
              </div>

              {currentLink.page_content && (
                <div
                  ref={pageContentRef}
                  className="article-content"
                  dangerouslySetInnerHTML={{ __html: currentLink.page_content }}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default Page
