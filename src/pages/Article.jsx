import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import Navbar from '@components/product/Navbar'
import Footer from '@components/common/Footer'
import useArticlesStore from '@store/articlesStore'
import Loader from '@components/common/Loader'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger)

const Article = () => {
  const { id } = useParams()
  const { currentArticle, fetchArticle, loading, error } = useArticlesStore()
  const articleSectionRef = useRef(null)
  const articleTitlesWrapRef = useRef(null)
  const articleImgWrapperRef = useRef(null)
  const articleContentRef = useRef(null)

  useEffect(() => {
    if (id) {
      fetchArticle(id)
    }
  }, [id, fetchArticle])

  // Скроллим вверх при монтировании страницы
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    // Дополнительно на случай, если первый вызов не сработал
    const timeoutId = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [])

  // Анимация появления элементов статьи
  useEffect(() => {
    if (articleSectionRef.current && currentArticle && !loading) {
      // Устанавливаем начальное состояние сразу при монтировании
      const titlesWrap = articleTitlesWrapRef.current
      const imgWrapper = articleImgWrapperRef.current
      const content = articleContentRef.current

      if (titlesWrap) {
        gsap.set(titlesWrap, {
          opacity: 0,
          y: 40
        })
      }

      if (imgWrapper) {
        gsap.set(imgWrapper, {
          opacity: 0,
          y: 40
        })
      }

      if (content) {
        gsap.set(content, {
          opacity: 0,
          y: 40
        })
      }

      // Небольшая задержка, чтобы убедиться, что DOM обновлен
      const timeoutId = setTimeout(() => {
        // Обновляем ScrollTrigger
        ScrollTrigger.refresh()

        // Анимация заголовков
        if (titlesWrap) {
          gsap.to(titlesWrap, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            delay: 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: articleSectionRef.current,
              start: 'top 80%',
              toggleActions: 'play none none none'
            }
          })
        }

        // Анимация изображения
        if (imgWrapper) {
          gsap.to(imgWrapper, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            delay: 0.2,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: articleSectionRef.current,
              start: 'top 80%',
              toggleActions: 'play none none none'
            }
          })
        }

        // Анимация контента
        if (content) {
          gsap.to(content, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            delay: 0.3,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: articleSectionRef.current,
              start: 'top 80%',
              toggleActions: 'play none none none'
            }
          })
        }
      }, 150) // Небольшая задержка для обновления DOM

      return () => {
        clearTimeout(timeoutId)
      }
    }
  }, [currentArticle, loading])

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

  if (error) {
    return (
      <div className="article-page relative bg-main-bg">
        <Navbar />
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          Ошибка загрузки: {error}
        </div>
        <Footer />
      </div>
    )
  }

  if (!currentArticle) {
    return (
      <div className="article-page relative bg-main-bg">
        <Navbar />
        <div className="text-center py-20">
          <p className="text-second-text text-lg">Статья не найдена</p>
        </div>
        <Footer />
      </div>
    )
  }

  // Форматируем дату
  const articleDate = currentArticle.published_at 
    ? new Date(currentArticle.published_at).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : new Date(currentArticle.created_at).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })

  return (
    <div className="article-page relative bg-main-bg">
      <Navbar />
      
      <section ref={articleSectionRef} className="single-article-section">
        <div className="padding-global">
          <div className="container-large">
            <div className="single-article-content">
              <div ref={articleTitlesWrapRef} className="article-titles-wrap">
                <p className="second-title">
                  <span style={{ color: '#000000' }}>[ </span>
                  {articleDate}
                  <span style={{ color: '#000000' }}> ]</span>
                </p>
                <div className="article-title-subtitle-wrap">
                  <h1 className="article-main-title">{currentArticle.title}</h1>
                  {currentArticle.subtitle && (
                    <p className="article-subtitle">{currentArticle.subtitle}</p>
                  )}
                </div>
              </div>
              
              {currentArticle.cover_image && (
                <div ref={articleImgWrapperRef} className="article-img-wrapper">
                  <img
                    src={currentArticle.cover_image}
                    alt={currentArticle.title}
                    className="article-cover-image"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                  />
                </div>
              )}
              
              {currentArticle.content && (
                <div 
                  ref={articleContentRef}
                  className="article-content"
                  dangerouslySetInnerHTML={{ __html: currentArticle.content }}
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

export default Article
