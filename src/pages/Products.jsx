import { useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '@components/product/Navbar'
import Footer from '@components/common/Footer'
import useProductsStore from '@store/productsStore'
import Loader from '@components/common/Loader'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger)

const Products = () => {
  const { products, loading, error, fetchProducts } = useProductsStore()
  const allProductsSectionRef = useRef(null)
  const allProductsTitleWrapperRef = useRef(null)
  const productsGridRef = useRef(null)

  // Скроллим вверх при монтировании страницы
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    // Дополнительно на случай, если первый вызов не сработал
    const timeoutId = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [])

  // Загружаем продукты при монтировании
  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Обновляем продукты при возврате на вкладку (если редактировали в админке в другой вкладке)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchProducts()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchProducts])

  // Мемоизируем отфильтрованные продукты
  const publishedProducts = useMemo(
    () => products.filter(product => product.status === 'published' && !product.show_only_on_main_model),
    [products]
  )

  // Проверяем настройки пользователя для уменьшенного движения
  const prefersReducedMotion = useMemo(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  // Анимация появления заголовка и карточек
  useEffect(() => {
    if (allProductsSectionRef.current) {
      const titleWrapper = allProductsTitleWrapperRef.current

      // Если пользователь предпочитает уменьшенное движение, пропускаем анимации
      if (prefersReducedMotion) {
        if (titleWrapper) {
          gsap.set(titleWrapper, { opacity: 1, y: 0 })
        }
        if (publishedProducts.length > 0) {
          const productCards = productsGridRef.current?.querySelectorAll('.product-card')
          if (productCards && productCards.length > 0) {
            gsap.set(productCards, { opacity: 1, x: 0, scale: 1 })
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

      if (publishedProducts.length > 0) {
        // Небольшая задержка, чтобы убедиться, что DOM обновлен
        const timeoutId = setTimeout(() => {
          const productCards = productsGridRef.current?.querySelectorAll('.product-card')

          // Устанавливаем начальное состояние карточек
          if (productCards && productCards.length > 0) {
            gsap.set(productCards, {
              opacity: 0,
              x: 40,
              scale: 0.95
            })
          }

          // Обновляем ScrollTrigger
          ScrollTrigger.refresh()

          // Проверяем, видна ли секция сразу (для немедленного запуска анимации)
          const sectionRect = allProductsSectionRef.current?.getBoundingClientRect()
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
                trigger: allProductsSectionRef.current,
                start: 'top 80%',
                toggleActions: 'play none none none'
              },
              onComplete: () => {
                // Убираем will-change после анимации
                gsap.set(titleWrapper, { willChange: 'auto' })
              }
            })
          }

          // Анимация карточек продуктов
          if (productCards && productCards.length > 0) {
            // Добавляем will-change для оптимизации
            gsap.set(productCards, { willChange: 'opacity, transform' })

            gsap.to(productCards, {
              opacity: 1,
              x: 0,
              scale: 1,
              duration: 0.8,
              stagger: 0.15,
              ease: 'power2.out',
              scrollTrigger: isSectionVisible ? undefined : {
                trigger: allProductsSectionRef.current,
                start: 'top 80%',
                toggleActions: 'play none none none'
              },
              onComplete: () => {
                // Убираем will-change после анимации
                gsap.set(productCards, { willChange: 'auto' })
              }
            })
          }
        }, 150) // Небольшая задержка для обновления DOM

        return () => {
          clearTimeout(timeoutId)
          // Очистка ScrollTrigger
          ScrollTrigger.getAll().forEach(trigger => {
            if (trigger.vars?.trigger === allProductsSectionRef.current) {
              trigger.kill()
            }
          })
          // Убираем will-change при размонтировании
          if (titleWrapper) {
            gsap.set(titleWrapper, { willChange: 'auto' })
          }
          const productCards = productsGridRef.current?.querySelectorAll('.product-card')
          if (productCards && productCards.length > 0) {
            gsap.set(productCards, { willChange: 'auto' })
          }
        }
      }
    }
  }, [publishedProducts.length, loading, prefersReducedMotion])

  return (
    <div className="products-page relative bg-main-bg">
      <Navbar />
      
      <section ref={allProductsSectionRef} className="all-products">
        <div className="padding-global">
          <div className="container-large">
            <div className="all-products-content">
              <div ref={allProductsTitleWrapperRef} className="all-products-title-wrapper">
                <h1 className="hero-text">ВСЕ КРЕСЛА</h1>
                <span className="all-products-count">{publishedProducts.length}</span>
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

              {!loading && !error && publishedProducts.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-second-text text-lg">Продукты не найдены</p>
                </div>
              )}

              {!loading && !error && publishedProducts.length > 0 && (
                <div ref={productsGridRef} className="products-grid">
                  {publishedProducts.map((product) => (
                    <Link
                      key={product.id}
                      to={`/product/${product.slug || product.id}`}
                      className="product-card"
                    >
                      {product.images && product.images.length > 0 && product.images[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="product-image"
                          onError={(e) => {
                            e.target.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="product-image bg-second-bg flex items-center justify-center">
                          <span className="text-second-text text-sm">Нет изображения</span>
                        </div>
                      )}
                      <div className="product-titles">
                        <h3 className="product-name">{product.name}</h3>
                        {product.type && (
                          <p className="product-type">{product.type}</p>
                        )}
                      </div>
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

export default Products

