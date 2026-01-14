import { useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '@components/product/Navbar'
import Footer from '@components/common/Footer'
import useArticlesStore from '@store/articlesStore'
import Loader from '@components/common/Loader'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger)

const Articles = () => {
  const { articles, loading, error, fetchArticles } = useArticlesStore()
  const allArticlesSectionRef = useRef(null)
  const allArticlesTitleWrapperRef = useRef(null)
  const articlesGridRef = useRef(null)

  // Скроллим вверх при монтировании страницы
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    // Дополнительно на случай, если первый вызов не сработал
    const timeoutId = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [])

  // Загружаем статьи при монтировании
  useEffect(() => {
    fetchArticles(true) // Принудительная загрузка
  }, [fetchArticles])

  // Мемоизируем отфильтрованные статьи
  const publishedArticles = useMemo(
    () => articles.filter(article => article.status === 'published'),
    [articles]
  )

  // Проверяем настройки пользователя для уменьшенного движения
  const prefersReducedMotion = useMemo(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  // Анимация появления заголовка и карточек
  useEffect(() => {
    if (allArticlesSectionRef.current) {
      const titleWrapper = allArticlesTitleWrapperRef.current

      // Если пользователь предпочитает уменьшенное движение, пропускаем анимации
      if (prefersReducedMotion) {
        if (titleWrapper) {
          gsap.set(titleWrapper, { opacity: 1, y: 0 })
        }
        if (publishedArticles.length > 0) {
          const articleCards = articlesGridRef.current?.querySelectorAll('.article')
          if (articleCards && articleCards.length > 0) {
            gsap.set(articleCards, { opacity: 1, x: 0, scale: 1 })
          }
        }
        return
      }

      // Устанавливаем начальное состояние сразу при монтировании
      if (titleWrapper) {
        gsap.set(titleWrapper, {
          opacity: 0,
          y: 40
        })
      }

      if (publishedArticles.length > 0) {
        // Небольшая задержка, чтобы убедиться, что DOM обновлен
        const timeoutId = setTimeout(() => {
          const articleCards = articlesGridRef.current?.querySelectorAll('.article')

          // Устанавливаем начальное состояние карточек
          if (articleCards && articleCards.length > 0) {
            gsap.set(articleCards, {
              opacity: 0,
              x: 40,
              scale: 0.95
            })
          }

          // Обновляем ScrollTrigger
          ScrollTrigger.refresh()

          // Проверяем, видна ли секция сразу (для немедленного запуска анимации)
          const sectionRect = allArticlesSectionRef.current?.getBoundingClientRect()
          const isSectionVisible = sectionRect && sectionRect.top < window.innerHeight * 0.8

        // Анимация заголовка
        if (titleWrapper) {
          // Добавляем will-change для оптимизации
          gsap.set(titleWrapper, { willChange: 'opacity, transform' })

          gsap.to(titleWrapper, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            delay: 0.1,
            ease: 'power3.out',
            scrollTrigger: isSectionVisible ? undefined : {
              trigger: allArticlesSectionRef.current,
              start: 'top 80%',
              toggleActions: 'play none none none'
            },
            onComplete: () => {
              // Убираем will-change после анимации
              gsap.set(titleWrapper, { willChange: 'auto' })
            }
          })
        }

        // Анимация карточек статей
        if (articleCards && articleCards.length > 0) {
          // Добавляем will-change для оптимизации
          gsap.set(articleCards, { willChange: 'opacity, transform' })

          gsap.to(articleCards, {
            opacity: 1,
            x: 0,
            scale: 1,
            duration: 0.8,
            stagger: 0.15,
            ease: 'power2.out',
            scrollTrigger: isSectionVisible ? undefined : {
              trigger: allArticlesSectionRef.current,
              start: 'top 80%',
              toggleActions: 'play none none none'
            },
            onComplete: () => {
              // Убираем will-change после анимации
              gsap.set(articleCards, { willChange: 'auto' })
            }
          })
          }
        }, 150) // Небольшая задержка для обновления DOM

        return () => {
          clearTimeout(timeoutId)
          // Очистка ScrollTrigger
          ScrollTrigger.getAll().forEach(trigger => {
            if (trigger.vars?.trigger === allArticlesSectionRef.current) {
              trigger.kill()
            }
          })
          // Убираем will-change при размонтировании
          if (titleWrapper) {
            gsap.set(titleWrapper, { willChange: 'auto' })
          }
          const articleCards = articlesGridRef.current?.querySelectorAll('.article')
          if (articleCards && articleCards.length > 0) {
            gsap.set(articleCards, { willChange: 'auto' })
          }
        }
      }
    }
  }, [publishedArticles.length, loading, prefersReducedMotion])

  return (
    <div className="articles-page relative bg-main-bg">
      <Navbar />
      
      <section ref={allArticlesSectionRef} className="all-articles">
        <div className="padding-global">
          <div className="container-large">
            <div className="all-articles-content">
              <div ref={allArticlesTitleWrapperRef} className="all-articles-title-wrapper">
                <h1 className="hero-text">ВСЕ СТАТЬИ</h1>
                <span className="all-articles-count">{publishedArticles.length}</span>
              </div>
              
              {loading && (
                <div className="flex justify-center items-center py-20">
                  <Loader />
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                  Ошибка загрузки: {error}
                </div>
              )}

              {!loading && !error && publishedArticles.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-second-text text-lg">Статьи не найдены</p>
                </div>
              )}

              {!loading && !error && publishedArticles.length > 0 && (
                <div ref={articlesGridRef} className="articles-grid">
                  {publishedArticles.map((article) => (
                    <Link
                      key={article.id}
                      to={`/article/${article.id}`}
                      className="article flex flex-col gap-4"
                    >
                      <p className="product-type">
                        <span style={{ color: '#000000' }}>[ </span>
                        {article.published_at 
                          ? new Date(article.published_at).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })
                          : new Date(article.created_at).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })
                        }
                        <span style={{ color: '#000000' }}> ]</span>
                      </p>
                      {article.cover_image ? (
                        <img
                          src={article.cover_image}
                          alt={article.title}
                          className="article-cover-image"
                          onError={(e) => {
                            e.target.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="article-cover-image bg-second-bg flex items-center justify-center">
                          <span className="text-second-text text-sm">Нет изображения</span>
                        </div>
                      )}
                      <h3 className="article-title">{article.title}</h3>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  )
}

export default Articles
