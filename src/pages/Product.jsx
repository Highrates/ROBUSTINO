import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGLTF } from '@react-three/drei'
import Navbar from '@components/product/Navbar'
import ModelViewer from '@components/3d/ModelViewer'
import useProductsStore from '@store/productsStore'
import useUpholsteryStore from '@store/upholsteryStore'
import Loader from '@components/common/Loader'

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger)

const Product = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { currentProduct, products, loading, error, fetchProductBySlug, fetchProducts } = useProductsStore()
  const { variants: upholsteryVariants, fetchVariants } = useUpholsteryStore()
  const [autoRotate, setAutoRotate] = useState(true)
  const [zoomLevel, setZoomLevel] = useState(0) // 0 = нормальный, 1 = приближенный, -1 = отдаленный
  const [modelScale, setModelScale] = useState(0.7) // Начальный scale для анимации (будет увеличиваться до 1)
  
  // Refs для анимаций
  const productSectionRef = useRef(null)
  const productContentTopRef = useRef(null)
  const modelContainerRef = useRef(null)
  const productInfoRefs = useRef([])
  const productContentBottomRef = useRef(null)
  
  // Refs для хранения анимаций и триггеров для правильной очистки
  const animationsRef = useRef([])
  const scrollTriggersRef = useRef([])

  // Скроллим вверх при монтировании страницы
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    // Дополнительно на случай, если первый вызов не сработал
    const timeoutId = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [])

  // Загружаем все продукты для навигации (только если их нет или кэш устарел)
  useEffect(() => {
    // Загружаем только если продуктов нет или кэш устарел
    if (products.length === 0) {
      fetchProducts(false) // Используем кэш, если есть
    }
  }, [fetchProducts, products.length])

  // Загружаем варианты обивки (только если их нет или кэш устарел)
  useEffect(() => {
    // Загружаем только если вариантов нет или кэш устарел
    if (upholsteryVariants.length === 0) {
      fetchVariants(false) // Используем кэш, если есть
    }
  }, [fetchVariants, upholsteryVariants.length])

  // Загружаем продукт при монтировании или изменении slug
  useEffect(() => {
    if (!slug) return

    // Сначала проверяем, есть ли продукт в уже загруженном списке по slug
    const productFromList = products.find(p => p.slug === slug && p.status === 'published')
    
    // Загружаем продукт только если его нет в списке или если это другой продукт
    if (!productFromList || currentProduct?.slug !== slug) {
      fetchProductBySlug(slug).catch(() => {
        // Ошибка уже обрабатывается в store
      })
    }
    // Убираем currentProduct?.slug из зависимостей, чтобы избежать бесконечного цикла
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, fetchProductBySlug])

  // Сбрасываем автоповорот при смене модели (при изменении slug)
  useEffect(() => {
    // Включаем автоповорот при переходе на новую модель
    setAutoRotate(true)
  }, [slug])

  // Проверяем настройки пользователя для уменьшенного движения
  const prefersReducedMotion = useMemo(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  // Анимации появления страницы
  useEffect(() => {
    if (!currentProduct || !productSectionRef.current) return

    // Если пользователь предпочитает уменьшенное движение, пропускаем анимации
    if (prefersReducedMotion) {
      // Устанавливаем финальные значения без анимации
      const contentTop = productContentTopRef.current
      const modelContainer = modelContainerRef.current
      const productInfos = productInfoRefs.current
      const contentBottom = productContentBottomRef.current

      if (contentTop) {
        gsap.set(contentTop, { opacity: 1, y: 0 })
      }
      if (modelContainer) {
        gsap.set(modelContainer, { opacity: 1 })
      }
      if (productInfos && productInfos.length > 0) {
        gsap.set(productInfos, { opacity: 1, x: 0 })
      }
      if (contentBottom) {
        gsap.set(contentBottom, { opacity: 1, y: 0 })
      }
      setModelScale(1.1) // Устанавливаем финальный размер модели
      return
    }

    // Устанавливаем начальное состояние элементов
    const contentTop = productContentTopRef.current
    const modelContainer = modelContainerRef.current
    const productInfos = productInfoRefs.current
    const contentBottom = productContentBottomRef.current

    if (contentTop) {
      gsap.set(contentTop, {
        opacity: 0,
        y: 40
      })
    }

    if (modelContainer) {
      gsap.set(modelContainer, {
        opacity: 0
      })
    }

    if (productInfos && productInfos.length > 0) {
      gsap.set(productInfos, {
        opacity: 0,
        x: 40
      })
    }

    if (contentBottom) {
      gsap.set(contentBottom, {
        opacity: 0,
        y: 20
      })
    }

    // Небольшая задержка для обновления DOM
    const timeoutId = setTimeout(() => {
      ScrollTrigger.refresh()

      // Проверяем, видна ли секция сразу (для немедленного запуска анимации)
      const sectionRect = productSectionRef.current?.getBoundingClientRect()
      const isSectionVisible = sectionRect && sectionRect.top < window.innerHeight * 0.8

      // Анимация верхней части (заголовки и ссылки)
      if (contentTop) {
        // Добавляем will-change для оптимизации
        gsap.set(contentTop, { willChange: 'opacity, transform' })
        
        const anim = gsap.to(contentTop, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          delay: 0.1,
          ease: 'power3.out',
          scrollTrigger: isSectionVisible ? undefined : {
            trigger: productSectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          },
          onComplete: () => {
            // Убираем will-change после анимации
            gsap.set(contentTop, { willChange: 'auto' })
          }
        })
        if (anim.scrollTrigger) {
          scrollTriggersRef.current.push(anim.scrollTrigger)
        }
        animationsRef.current.push(anim)
      }

      // Анимация 3D модели (увеличение и подкручивание)
      if (modelContainer) {
        // Добавляем will-change для оптимизации
        gsap.set(modelContainer, { willChange: 'opacity' })
        
        // Анимируем контейнер (opacity)
        const containerAnim = gsap.to(modelContainer, {
          opacity: 1,
          duration: 1.2,
          delay: 0.3,
          ease: 'power3.out',
          scrollTrigger: isSectionVisible ? undefined : {
            trigger: productSectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          },
          onComplete: () => {
            // Убираем will-change после анимации
            gsap.set(modelContainer, { willChange: 'auto' })
          }
        })
        if (containerAnim.scrollTrigger) {
          scrollTriggersRef.current.push(containerAnim.scrollTrigger)
        }
        animationsRef.current.push(containerAnim)

        // Анимируем только scale модели через состояние
        // Используем объект-прокси для анимации значений
        const modelAnimation = {
          scale: 0.7 // Начальный scale (будет увеличиваться до 1 - базовый размер)
        }

        const modelScaleAnim = gsap.to(modelAnimation, {
          scale: 1, // Конечный scale (базовый размер модели)
          duration: 1.2,
          delay: 0.3,
          ease: 'power3.out',
          onUpdate: function() {
            // Обновляем только scale
            setModelScale(modelAnimation.scale)
          },
          onComplete: function() {
            // Убеждаемся, что после анимации модель имеет правильный размер
            setModelScale(1)
          },
          scrollTrigger: isSectionVisible ? undefined : {
            trigger: productSectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        })
        if (modelScaleAnim.scrollTrigger) {
          scrollTriggersRef.current.push(modelScaleAnim.scrollTrigger)
        }
        animationsRef.current.push(modelScaleAnim)
      }

      // Анимация информации о продукте (stagger)
      if (productInfos && productInfos.length > 0) {
        // Добавляем will-change для оптимизации
        gsap.set(productInfos, { willChange: 'opacity, transform' })
        
        const productInfosAnim = gsap.to(productInfos, {
          opacity: 1,
          x: 0,
          duration: 0.8,
          delay: 0.5,
          stagger: 0.1,
          ease: 'power2.out',
          scrollTrigger: isSectionVisible ? undefined : {
            trigger: productSectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          },
          onComplete: () => {
            // Убираем will-change после анимации
            gsap.set(productInfos, { willChange: 'auto' })
          }
        })
        if (productInfosAnim.scrollTrigger) {
          scrollTriggersRef.current.push(productInfosAnim.scrollTrigger)
        }
        animationsRef.current.push(productInfosAnim)
      }

      // Анимация нижней части (кнопки управления)
      if (contentBottom) {
        // Добавляем will-change для оптимизации
        gsap.set(contentBottom, { willChange: 'opacity, transform' })
        
        const contentBottomAnim = gsap.to(contentBottom, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          delay: 0.7,
          ease: 'power3.out',
          scrollTrigger: isSectionVisible ? undefined : {
            trigger: productSectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          },
          onComplete: () => {
            // Убираем will-change после анимации
            gsap.set(contentBottom, { willChange: 'auto' })
          }
        })
        if (contentBottomAnim.scrollTrigger) {
          scrollTriggersRef.current.push(contentBottomAnim.scrollTrigger)
        }
        animationsRef.current.push(contentBottomAnim)
      }
    }, 150)

    return () => {
      clearTimeout(timeoutId)
      
      // Очистка всех анимаций
      animationsRef.current.forEach(anim => {
        if (anim && anim.kill) {
          anim.kill()
        }
      })
      animationsRef.current = []
      
      // Очистка всех ScrollTrigger
      scrollTriggersRef.current.forEach(trigger => {
        if (trigger && trigger.kill) {
          trigger.kill()
        }
      })
      scrollTriggersRef.current = []
      
      // Дополнительная очистка всех ScrollTrigger, связанных с этой секцией
      ScrollTrigger.getAll().forEach(trigger => {
        if (trigger.vars?.trigger === productSectionRef.current) {
          trigger.kill()
        }
      })
      
      // Убираем will-change при размонтировании
      const elements = [
        productContentTopRef.current,
        modelContainerRef.current,
        ...(productInfoRefs.current || []),
        productContentBottomRef.current
      ]
      elements.forEach(el => {
        if (el) gsap.set(el, { willChange: 'auto' })
      })
    }
  }, [currentProduct, prefersReducedMotion])

  // Получаем опубликованные продукты, отсортированные по display_order
  const publishedProducts = useMemo(() => {
    if (!products || products.length === 0) return []
    
    return products
      .filter(product => product && product.status === 'published')
      .sort((a, b) => {
        if (a.display_order !== null && b.display_order !== null) {
          return a.display_order - b.display_order
        }
        if (a.display_order !== null) return -1
        if (b.display_order !== null) return 1
        const aDate = a.created_at ? new Date(a.created_at) : new Date(0)
        const bDate = b.created_at ? new Date(b.created_at) : new Date(0)
        return bDate - aDate
      })
  }, [products])

  // Находим следующий продукт
  const nextProduct = useMemo(() => {
    if (!currentProduct?.id || !publishedProducts || publishedProducts.length === 0) return null
    
    const currentIndex = publishedProducts.findIndex(p => p?.id === currentProduct.id)
    if (currentIndex === -1) return null
    
    // Если это последний продукт, возвращаем первый (циклическая навигация)
    const nextIndex = (currentIndex + 1) % publishedProducts.length
    return publishedProducts[nextIndex] || null
  }, [currentProduct?.id, publishedProducts])

  // Предзагрузка следующей модели
  useEffect(() => {
    if (nextProduct?.model_url) {
      // Предзагружаем следующую модель только если она отличается от текущей
      const shouldPreload = !currentProduct?.model_url || 
                           nextProduct.model_url !== currentProduct.model_url
      
      if (shouldPreload) {
        // Предзагружаем следующую модель для быстрой загрузки при переходе
        // useGLTF.preload - метод для предзагрузки вне Canvas
        try {
          // Проверяем, что метод preload существует
          if (typeof useGLTF.preload === 'function') {
            useGLTF.preload(nextProduct.model_url)
          } else {
            console.warn('useGLTF.preload не доступен. Предзагрузка модели пропущена.')
          }
        } catch (error) {
          // Игнорируем ошибки предзагрузки (модель может быть недоступна)
          console.debug('Не удалось предзагрузить следующую модель:', error)
        }
      }
    }
  }, [nextProduct?.model_url, currentProduct?.model_url])
  
  // Массив материалов для данного продукта
  const materials = [
    '/materials/material1.jpg',
    '/materials/material2.jpg',
    '/materials/material3.jpg',
  ]
  
  const currentMaterialIndex = 0 // Индекс текущего материала

  // Функции зума
  const handleZoomIn = () => {
    if (zoomLevel < 1) {
      setZoomLevel(zoomLevel + 1)
    }
  }

  const handleZoomOut = () => {
    if (zoomLevel > -1) {
      setZoomLevel(zoomLevel - 1)
    }
  }

  // Показываем загрузку только если загружаем первый раз
  if (loading && !currentProduct && !error) {
    return (
      <div className="product-page relative bg-main-bg">
        <Navbar />
        <div className="padding-global" style={{ paddingTop: 'calc(var(--navbar-height) + 3.5rem)' }}>
          <Loader />
        </div>
      </div>
    )
  }

  // Показываем ошибку только если есть ошибка или продукт не найден после загрузки
  if ((error || (!currentProduct && !loading)) && slug) {
    return (
      <div className="product-page relative bg-main-bg">
        <Navbar />
        <div className="padding-global" style={{ paddingTop: 'calc(var(--navbar-height) + 3.5rem)' }}>
          <p className="text-red-500">
            Ошибка загрузки продукта: {error || 'Продукт не найден'}
            {slug && ` (slug: ${slug})`}
          </p>
          <Link to="/products" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
            Вернуться в каталог
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="product-page relative bg-main-bg">
      <Navbar />
      
      {/* Product Section - Fullscreen 3D Scene */}
      <section ref={productSectionRef} className="product-section relative" style={{ minHeight: '100vh', paddingTop: 'var(--navbar-height)' }}>
        <div className="padding-global">
          <div className="container-large relative" style={{ height: 'calc(100vh - var(--navbar-height))' }}>
            
            {/* 3D Model Container - Fullscreen */}
            <div 
              ref={modelContainerRef} 
              className="product-3d-scene absolute inset-0"
              style={{ height: '100%' }}
            >
              {currentProduct?.model_url ? (
                <ModelViewer 
                  modelPath={currentProduct.model_url}
                  enableControls={true}
                  autoRotate={autoRotate}
                  onUserInteraction={() => setAutoRotate(false)}
                  onAutoRotateEnd={() => setAutoRotate(false)}
                  zoomLevel={zoomLevel}
                  cameraPosition={[0, 0.5, 3]}
                  modelRotation={[0, -0.15, 0]}
                  scale={modelScale}
                />
              ) : (
                <div className="text-second-text text-sm flex items-center justify-center h-full" role="status" aria-live="polite">
                  3D модель не загружена
                </div>
              )}
            </div>
            
            {/* Product Content Top - Absolute Overlay */}
            <div 
              ref={productContentTopRef} 
              className="product-content-top absolute inline-flex justify-between items-start"
              style={{ 
                top: '40px',
                left: 0,
                right: 0,
                width: '100%',
                zIndex: 10
              }}
            >
              {/* Вернуться в каталог */}
              <Link 
                to="/products" 
                className="text-[14px] uppercase text-main-text hover:text-second-text transition-colors"
                style={{ fontWeight: 450, padding: 0 }}
              >
                Вернуться в каталог
              </Link>

              {/* Product Titles */}
              <div className="product-titles inline-flex flex-col justify-start items-center gap-0.5">
                {/* Subtitle */}
                {currentProduct?.type && (
                <p 
                  className="text-[14px] text-second-text uppercase"
                  style={{ fontWeight: 450 }}
                >
                    {currentProduct.type}
                </p>
                )}

                {/* Product Name */}
                <h1 
                  className="text-[24px] text-main-text uppercase"
                  style={{ fontWeight: 450, letterSpacing: '-0.02em' }}
                >
                  {currentProduct?.name || 'Название продукта'}
                </h1>

                {/* Product Materials Wrap */}
                <div 
                  className="product-materials-wrap inline-flex justify-start items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => navigate('/upholstery')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate('/upholstery')
                    }
                  }}
                  aria-label="Перейти к вариантам обивки кресел"
                >
                  {/* Materials */}
                  <div className="materials w-7 h-7 relative">
                    {/* Border circle */}
                    <div className="w-7 h-7 left-0 top-0 absolute rounded-full border-[0.50px] border-black/25"></div>
                    {/* Material image */}
                    <div 
                      className="w-6 h-6 left-[2px] top-[2px] absolute rounded-full backdrop-blur-[2px] bg-cover bg-center"
                      style={{ backgroundImage: `url(${materials[currentMaterialIndex]})` }}
                    ></div>
                  </div>

                  {/* Count Materials */}
                  <div className="count-materials inline-flex justify-start items-center gap-1.5">
                    <span className="text-main-text" style={{ fontSize: '15px', fontWeight: 450 }}>
                      / {upholsteryVariants?.length || 0}
                    </span>
                    <span className="text-main-text" style={{ fontSize: '15px' }} aria-hidden="true">→</span>
                  </div>
                </div>
              </div>

              {/* Следующая модель */}
              {nextProduct ? (
              <Link 
                  to={`/product/${nextProduct.slug || nextProduct.id}`}
                className="text-[14px] uppercase text-main-text hover:text-second-text transition-colors"
                style={{ fontWeight: 450, padding: 0 }}
              >
                Следующая модель
              </Link>
              ) : (
                <div className="text-[14px] uppercase text-second-text" style={{ fontWeight: 450, padding: 0 }}>
                  Следующая модель
                </div>
              )}
            </div>

            {/* Product Content Mid - Absolute Overlay Right */}
            <div 
              className="product-content-mid absolute inline-flex flex-col justify-start items-start gap-4"
              style={{
                right: 'clamp(1rem, 3vw, 2.5rem)',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10
              }}
            >
                  {/* Product Info 1 */}
                  <div ref={el => productInfoRefs.current[0] = el} className="product-info self-stretch inline-flex flex-col justify-start items-start gap-0.5">
                    <p className="text-[14px] text-second-text uppercase" style={{ fontWeight: 450 }}>
                      Срок поставки
                    </p>
                    <p className="text-[14px] text-main-text uppercase" style={{ fontWeight: 450 }}>
                      {currentProduct?.delivery_time || 'не указано'}
                    </p>
                  </div>

                  {/* Product Info 2 */}
                  <div ref={el => productInfoRefs.current[1] = el} className="product-info self-stretch inline-flex flex-col justify-start items-start gap-0.5">
                    <p className="text-[14px] text-second-text uppercase" style={{ fontWeight: 450 }}>
                      Объем товара в упаковке
                    </p>
                    <p className="text-[14px] text-main-text uppercase" style={{ fontWeight: 450 }}>
                      {currentProduct?.volume_m3 ? `${currentProduct.volume_m3} м³` : 'не указано'}
                    </p>
                  </div>

                  {/* Product Info 3 */}
                  <div ref={el => productInfoRefs.current[2] = el} className="product-info self-stretch inline-flex flex-col justify-start items-start gap-0.5">
                    <p className="text-[14px] text-second-text uppercase" style={{ fontWeight: 450 }}>
                      Вес
                    </p>
                    <p className="text-[14px] text-main-text uppercase" style={{ fontWeight: 450 }}>
                      {currentProduct?.weight_kg ? `${currentProduct.weight_kg} кг` : 'не указано'}
                    </p>
                  </div>

                  {/* Product Info 4 */}
                  <div ref={el => productInfoRefs.current[3] = el} className="product-info self-stretch inline-flex flex-col justify-start items-start gap-0.5">
                    <p className="text-[14px] text-second-text uppercase" style={{ fontWeight: 450 }}>
                      Наличие
                    </p>
                    <p className="text-[14px] text-main-text uppercase" style={{ fontWeight: 450 }}>
                      {currentProduct?.in_stock || 'не указано'}
                    </p>
                  </div>
            </div>

            {/* Product Content Bottom - Absolute Overlay */}
            <div 
              ref={productContentBottomRef} 
              className="product-content-bottom absolute p-2.5 inline-flex justify-center items-center gap-2.5 overflow-hidden"
              style={{
                bottom: '40px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10
              }}
            >
                     <div className="inline-flex justify-start items-center gap-4">
                       {/* 3D Rotate Icon */}
                       <button
                         type="button"
                         className={`w-6 h-6 flex items-center justify-center cursor-pointer transition-opacity ${autoRotate ? 'opacity-100' : 'opacity-50'}`}
                         onClick={() => setAutoRotate(!autoRotate)}
                         aria-label={autoRotate ? 'Остановить автоповорот модели' : 'Включить автоповорот модели'}
                         aria-pressed={autoRotate}
                       >
                         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                           <path d="M15 14.8016C14.0969 14.9216 13.1003 15 12 15C7.02768 15 3 13.2099 3 11C3 8.79008 7.02768 7 12 7C16.9723 7 21 8.79008 21 11C21 11.8212 20.4394 12.5871 19.4844 13.2238" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                           <path d="M16.1562 14.802L13.0354 17.9061" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                           <path d="M16.1562 14.802L12.9714 12.1066" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                         </svg>
                       </button>

                       {/* Divider */}
                       <div className="w-0 h-4 origin-top-left rotate-[0deg] outline outline-1 outline-offset-[-0.50px] outline-black/25" aria-hidden="true"></div>

                       {/* Zoom + Icon */}
                       <button
                         type="button"
                         className={`w-[22px] h-[22px] flex items-center justify-center cursor-pointer transition-opacity ${zoomLevel >= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                         onClick={handleZoomIn}
                         disabled={zoomLevel >= 1}
                         aria-label="Увеличить масштаб модели"
                       >
                         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px]">
                           <path d="M9.19995 11.7H14.2" stroke="#666666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                           <path d="M11.7 14.2V9.19995" stroke="#666666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                           <path d="M11.5 21C16.7467 21 21 16.7467 21 11.5C21 6.25329 16.7467 2 11.5 2C6.25329 2 2 6.25329 2 11.5C2 16.7467 6.25329 21 11.5 21Z" stroke="#666666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                           <path d="M22 22L20 20" stroke="#666666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                         </svg>
                       </button>

                       {/* Zoom - Icon */}
                       <button
                         type="button"
                         className={`w-[22px] h-[22px] flex items-center justify-center cursor-pointer transition-opacity ${zoomLevel <= -1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                         onClick={handleZoomOut}
                         disabled={zoomLevel <= -1}
                         aria-label="Уменьшить масштаб модели"
                       >
                         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[22px] h-[22px]">
                           <path d="M9 11.7H14" stroke="#666666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                           <path d="M11.5 21C16.7467 21 21 16.7467 21 11.5C21 6.25329 16.7467 2 11.5 2C6.25329 2 2 6.25329 2 11.5C2 16.7467 6.25329 21 11.5 21Z" stroke="#666666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                           <path d="M22 22L20 20" stroke="#666666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                         </svg>
                       </button>
                     </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  )
}

export default Product

