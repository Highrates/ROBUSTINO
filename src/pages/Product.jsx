import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, Link, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGLTF } from '@react-three/drei'
import Navbar from '@components/product/Navbar'
import ModelViewer from '@components/3d/ModelViewer'
import useProductsStore from '@store/productsStore'
import useUpholsteryStore from '@store/upholsteryStore'
import useProjectsStore from '@store/projectsStore'
import { getProductProjects } from '@utils/api'
import { getCatalogProducts, getNextCatalogProduct, getProductPath } from '@utils/catalogProducts'
import Loader from '@components/common/Loader'

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger)

const Product = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { currentProduct, products, loading, error, fetchProductBySlug, fetchProducts } = useProductsStore()
  const { variants: upholsteryVariants, fetchVariants } = useUpholsteryStore()
  const { projects, fetchProjects } = useProjectsStore()
  const [autoRotate, setAutoRotate] = useState(true)
  const [zoomLevel, setZoomLevel] = useState(0) // 0 = нормальный, 1 = приближенный, -1 = отдаленный
  const [modelScale, setModelScale] = useState(0.7) // Начальный scale для анимации (будет увеличиваться до 1)
  
  // Image viewer state
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [viewerImages, setViewerImages] = useState([])
  
  // Project modal state
  const [selectedProject, setSelectedProject] = useState(null)
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
  const [isProjectModalClosing, setIsProjectModalClosing] = useState(false)
  const projectModalCloseTimerRef = useRef(null)
  // Проекты, привязанные к продукту через product_projects (из админки «Реализованные объекты»)
  const [productProjects, setProductProjects] = useState([])
  const [isModelFormatMenuOpen, setIsModelFormatMenuOpen] = useState(false)
  const modelFormatMenuRef = useRef(null)
  
  // Refs для анимаций
  const productSectionRef = useRef(null)
  const productContentTopRef = useRef(null)
  const modelContainerRef = useRef(null)
  const productInfoRefs = useRef([])
  const productContentBottomRef = useRef(null)
  
  // Refs для product-details-section
  const productDetailsSectionRef = useRef(null)
  const pdcLeftRef = useRef(null)
  const pdcRightRef = useRef(null)

  // Refs для синхронизации высот левого и правого product-content-mid
  const productContentMidLeftRef = useRef(null)
  const productContentMidRightRef = useRef(null)
  const [contentMidHeight, setContentMidHeight] = useState(224)

  // Refs для хранения анимаций и триггеров для правильной очистки
  const animationsRef = useRef([])
  const scrollTriggersRef = useRef([])
  const detailsAnimationsRef = useRef([])
  const detailsScrollTriggersRef = useRef([])

  // Скроллим вверх при смене модели
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [slug])

  // Загружаем все продукты для навигации по каталогу
  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Загружаем варианты обивки (только если их нет или кэш устарел)
  useEffect(() => {
    // Загружаем только если вариантов нет или кэш устарел
    if (upholsteryVariants.length === 0) {
      fetchVariants()
    }
  }, [fetchVariants, upholsteryVariants.length])

  // Загружаем проекты для модального окна (список всех проектов)
  useEffect(() => {
    if (projects.length === 0) {
      fetchProjects()
    }
  }, [fetchProjects, projects.length])

  // Загружаем проекты, привязанные к продукту через «Реализованные объекты» в админке
  useEffect(() => {
    if (!currentProduct?.id) {
      setProductProjects([])
      return
    }
    let cancelled = false
    getProductProjects(currentProduct.id)
      .then((projectsList) => {
        if (!cancelled) {
          setProductProjects(projectsList || [])
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Ошибка загрузки проектов продукта:', err)
          setProductProjects([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [currentProduct?.id])

  // Загружаем продукт при монтировании или изменении slug
  useEffect(() => {
    if (!slug) return

    // Сначала проверяем, есть ли продукт в уже загруженном списке по slug
    const productFromList = products.find(p => p.slug === slug && p.status === 'published' && !p.show_only_on_main_model)
    
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
        gsap.set(contentBottom, { opacity: 1, y: 0, xPercent: -50 })
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
        y: 20,
        xPercent: -50
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
          xPercent: -50,
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

  // Анимации product-details-section
  useEffect(() => {
    if (!currentProduct || !productDetailsSectionRef.current) return

    const pdcLeft = pdcLeftRef.current
    const pdcRight = pdcRightRef.current

    if (prefersReducedMotion) {
      if (pdcLeft) gsap.set(pdcLeft, { opacity: 1, x: 0 })
      if (pdcRight) gsap.set(pdcRight, { opacity: 1, x: 0 })
      return
    }

    // Начальное состояние
    if (pdcLeft) {
      gsap.set(pdcLeft, { opacity: 0, x: -40 })
    }
    if (pdcRight) {
      gsap.set(pdcRight, { opacity: 0, x: 40 })
    }

    const timeoutId = setTimeout(() => {
      ScrollTrigger.refresh()

      const sectionRect = productDetailsSectionRef.current?.getBoundingClientRect()
      const isSectionVisible = sectionRect && sectionRect.top < window.innerHeight * 0.8

      if (pdcLeft) {
        gsap.set(pdcLeft, { willChange: 'opacity, transform' })
        const anim = gsap.to(pdcLeft, {
          opacity: 1,
          x: 0,
          duration: 0.8,
          delay: 0.1,
          ease: 'power3.out',
          scrollTrigger: isSectionVisible ? undefined : {
            trigger: productDetailsSectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          },
          onComplete: () => gsap.set(pdcLeft, { willChange: 'auto' })
        })
        if (anim.scrollTrigger) detailsScrollTriggersRef.current.push(anim.scrollTrigger)
        detailsAnimationsRef.current.push(anim)
      }

      if (pdcRight) {
        gsap.set(pdcRight, { willChange: 'opacity, transform' })
        const anim = gsap.to(pdcRight, {
          opacity: 1,
          x: 0,
          duration: 0.8,
          delay: 0.3,
          ease: 'power3.out',
          scrollTrigger: isSectionVisible ? undefined : {
            trigger: productDetailsSectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          },
          onComplete: () => gsap.set(pdcRight, { willChange: 'auto' })
        })
        if (anim.scrollTrigger) detailsScrollTriggersRef.current.push(anim.scrollTrigger)
        detailsAnimationsRef.current.push(anim)
      }
    }, 150)

    return () => {
      clearTimeout(timeoutId)
      detailsAnimationsRef.current.forEach(anim => anim?.kill?.())
      detailsAnimationsRef.current = []
      detailsScrollTriggersRef.current.forEach(trigger => trigger?.kill?.())
      detailsScrollTriggersRef.current = []
      ScrollTrigger.getAll().forEach(trigger => {
        if (trigger.vars?.trigger === productDetailsSectionRef.current) trigger.kill()
      })
      if (pdcLeft) gsap.set(pdcLeft, { willChange: 'auto' })
      if (pdcRight) gsap.set(pdcRight, { willChange: 'auto' })
    }
  }, [currentProduct, prefersReducedMotion])

  const catalogProducts = useMemo(() => getCatalogProducts(products), [products])

  const nextProduct = useMemo(
    () => getNextCatalogProduct(currentProduct, catalogProducts),
    [currentProduct, catalogProducts]
  )

  const nextProductPath = useMemo(() => getProductPath(nextProduct), [nextProduct])

  // Конфигурации модели — товары, у которых parent_product_id = текущий продукт (из админки)
  const modelConfigurations = useMemo(() => {
    if (!currentProduct?.id || !products?.length) return []
    return products
      .filter(p => p?.parent_product_id === currentProduct.id && p?.status === 'published')
      .sort((a, b) => {
        if (a.display_order != null && b.display_order != null) return a.display_order - b.display_order
        if (a.display_order != null) return -1
        if (b.display_order != null) return 1
        return 0
      })
  }, [currentProduct?.id, products])

  // Основная модель — родительский товар, если текущий продукт является конфигурацией
  const parentProduct = useMemo(() => {
    if (!currentProduct?.parent_product_id || !products?.length) return null
    return products.find(p => p?.id === currentProduct.parent_product_id && p?.status === 'published') || null
  }, [currentProduct?.parent_product_id, products])

  // Список для блока «Конфигурации модели»: на странице основной модели — её конфигурации; на странице конфигурации — основная модель и все её конфигурации
  const configProductsForBlock = useMemo(() => {
    if (!products?.length) return []
    if (parentProduct) {
      const siblings = products
        .filter(p => p?.parent_product_id === parentProduct.id && p?.status === 'published')
        .sort((a, b) => {
          if (a.display_order != null && b.display_order != null) return a.display_order - b.display_order
          if (a.display_order != null) return -1
          if (b.display_order != null) return 1
          return 0
        })
      return [parentProduct, ...siblings]
    }
    return modelConfigurations
  }, [parentProduct, modelConfigurations, products])

  // Синхронизация высот левого и правого блоков product-content-mid (по максимальной высоте контента)
  useLayoutEffect(() => {
    const leftH = productContentMidLeftRef.current?.scrollHeight ?? 0
    const rightH = productContentMidRightRef.current?.scrollHeight ?? 0
    const maxH = Math.max(224, leftH, rightH)
    setContentMidHeight(maxH)
  }, [currentProduct, configProductsForBlock])

  // Закрытие меню форматов 3D модели по клику вне
  useEffect(() => {
    if (!isModelFormatMenuOpen) return
    const handleClickOutside = (e) => {
      if (modelFormatMenuRef.current && !modelFormatMenuRef.current.contains(e.target)) {
        setIsModelFormatMenuOpen(false)
      }
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsModelFormatMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isModelFormatMenuOpen])

  // Сбрасываем меню форматов при смене модели
  useEffect(() => {
    setIsModelFormatMenuOpen(false)
  }, [slug])

  // productProjects загружаются через getProductProjects (таблица product_projects)

  // Открытие просмотра изображения
  const handleOpenImageViewer = (images, startIndex = 0) => {
    setViewerImages(images)
    setCurrentImageIndex(startIndex)
    setIsImageViewerOpen(true)
  }

  // Закрытие просмотра изображения
  const handleCloseImageViewer = () => {
    setIsImageViewerOpen(false)
    setViewerImages([])
    setCurrentImageIndex(0)
  }

  // Переход к следующему изображению
  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % viewerImages.length)
  }

  // Переход к предыдущему изображению
  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + viewerImages.length) % viewerImages.length)
  }

  // Открытие модального окна проекта
  const handleOpenProjectModal = (project) => {
    setSelectedProject(project)
    setIsProjectModalClosing(false)
    setIsProjectModalOpen(true)
  }

  // Закрытие модального окна проекта с анимацией
  const handleCloseProjectModal = () => {
    if (projectModalCloseTimerRef.current) {
      clearTimeout(projectModalCloseTimerRef.current)
    }
    
    setIsProjectModalClosing(true)
    projectModalCloseTimerRef.current = setTimeout(() => {
      setIsProjectModalOpen(false)
      setIsProjectModalClosing(false)
      setSelectedProject(null)
      projectModalCloseTimerRef.current = null
    }, 400) // Длительность анимации
  }

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
        <div className="padding-global product-page-content-pad">
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
        <div className="padding-global product-page-content-pad">
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
      <section ref={productSectionRef} className="product-section relative">
        <div className="padding-global">
          <div className="container-large product-section-inner relative">
            
            {/* 3D Model Container - Fullscreen */}
            <div 
              ref={modelContainerRef} 
              className="product-3d-scene absolute inset-0"
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
            >
              <div className="product-content-nav">
                {/* Вернуться в каталог */}
                <Link 
                  to="/products" 
                  className="product-nav-link text-[14px] uppercase text-main-text hover:text-second-text transition-colors"
                >
                  <span className="product-nav-link-full">Вернуться в каталог</span>
                  <span className="product-nav-link-short">Каталог</span>
                </Link>

                {/* Следующая модель */}
                {nextProductPath ? (
                <Link 
                    to={nextProductPath}
                  className="product-nav-link text-[14px] uppercase text-main-text hover:text-second-text transition-colors"
                  aria-label={`Следующая модель: ${nextProduct?.name || ''}`}
                >
                  <span className="product-nav-link-full">Следующая модель</span>
                  <span className="product-nav-link-short">Далее</span>
                </Link>
                ) : (
                  <div className="product-nav-link product-nav-link--disabled text-[14px] uppercase text-second-text">
                    <span className="product-nav-link-full">Следующая модель</span>
                    <span className="product-nav-link-short">Далее</span>
                  </div>
                )}
              </div>

              {/* Product Titles — порядок как на Home и Products: сначала название, затем тип */}
              <div className="product-titles inline-flex flex-col justify-start items-center gap-0.5">
                {/* Product Name (основной заголовок) */}
                <h1 className="product-page-title text-[24px] text-main-text uppercase">
                  {currentProduct?.name || 'Название продукта'}
                </h1>

                {/* Subtitle (тип) */}
                {currentProduct?.type && (
                <p className="product-page-subtitle text-[14px] text-second-text uppercase">
                    {currentProduct.type}
                </p>
                )}

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
            </div>

            {/* Product Content Mid - Absolute Overlay Left: конфигурации / основная модель (первое изображение, клик → страница товара) */}
            {configProductsForBlock.length > 0 && (
              <div
                ref={productContentMidLeftRef}
                className="product-content-mid product-content-mid-left absolute inline-flex flex-col justify-start items-start gap-4"
                style={{
                  minHeight: 224,
                  height: contentMidHeight
                }}
              >
                <p className="text-[14px] text-second-text uppercase" style={{ fontWeight: 450 }}>
                  Конфигурации модели
                </p>
                <div className="product-config-grid grid grid-cols-2 gap-2">
                  {configProductsForBlock.map((product) => {
                    const firstImage = product?.images?.[0]
                    const href = `/product/${product.slug || product.id}`
                    return (
                      <Link
                        key={product.id}
                        to={href}
                        className="product-config-thumb block rounded overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-second-text hover:outline hover:outline-[0.5px] hover:outline-black/[0.16]"
                        aria-label={`Перейти к товару: ${product.name}`}
                      >
                        {firstImage ? (
                          <img
                            src={firstImage}
                            alt=""
                            className="product-config-thumb-img object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="product-config-thumb-img bg-gray-200 flex items-center justify-center text-second-text text-xs">
                            Нет фото
                          </div>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Product Content Mid - Absolute Overlay Right */}
            <div 
              ref={productContentMidRightRef}
              className="product-content-mid product-content-mid-right absolute inline-flex flex-col justify-start items-start gap-4"
              style={{
                minHeight: 224,
                height: contentMidHeight
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

      {/* Product Details Section */}
      <section ref={productDetailsSectionRef} className="product-details-section relative" style={{ backgroundColor: '#3d3d3d' }}>
        <div className="padding-global">
          <div className="container-large">
            <div className="product-details-content">
              {/* Описание — на мобилке первым, на десктопе справа */}
              <div ref={pdcRightRef} className="product-details-description">
                {currentProduct?.description && (
                  <div 
                    className="project-modal-description"
                    dangerouslySetInnerHTML={{ __html: currentProduct.description }}
                  />
                )}
              </div>

              {/* Боковая колонка: проекты, фото, ссылки */}
              <div ref={pdcLeftRef} className="pdc-aside">
                {/* Реализованные объекты с этой моделью */}
                {productProjects.length > 0 && (
                  <div className="project-modal-info-item product-details-projects">
                    <p className="project-modal-info-label">Реализованные объекты с этой моделью</p>
                    <div className="product-details-projects-list">
                      {productProjects.slice(0, 7).map((project) => (
                        <span
                          key={project.id}
                          onClick={() => handleOpenProjectModal(project)}
                          className="project-modal-info-value project-modal-link"
                        >
                          {project.name}
                        </span>
                      ))}
                      {productProjects.length > 7 && (
                        <Link
                          to="/projects"
                          className="project-modal-info-value project-modal-link"
                        >
                          +{productProjects.length - 7}
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {/* Изображения продукта (начиная со второго) */}
                {currentProduct?.images && currentProduct.images.length > 1 && (
                  <div className="project-imgs-wrapper product-details-gallery">
                    {currentProduct.images.slice(1, 4).map((image, index) => {
                      const isLastVisible = index === 2 && currentProduct.images.length > 4
                      const remainingCount = currentProduct.images.length - 4
                      
                      return (
                        <div
                          key={index}
                          className="project-modal-image-container"
                          onClick={() => handleOpenImageViewer(currentProduct.images.slice(1), index)}
                        >
                          <img
                            src={image}
                            alt={`${currentProduct.name} - изображение ${index + 2}`}
                            className="project-modal-image"
                            onError={(e) => {
                              e.target.style.display = 'none'
                            }}
                          />
                          {isLastVisible && (
                            <div className="project-modal-image-overlay">
                              <span className="project-modal-image-count">+{remainingCount}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Ссылки: PDF и 3D модель */}
                <div className="product-details-links">
                  <a
                    href={currentProduct?.document_url || '#'}
                    target={currentProduct?.document_url ? '_blank' : undefined}
                    rel={currentProduct?.document_url ? 'noopener noreferrer' : undefined}
                    className={`product-details-link${currentProduct?.document_url ? '' : ' product-details-link--disabled'}`}
                  >
                    <span className="product-details-link-bracket">[ </span>
                    <span>Презентация кресла PDF</span>
                    <span className="product-details-link-bracket"> ]</span>
                  </a>

                  {(() => {
                    const hasGlb = Boolean(currentProduct?.model_url)
                    const hasMax = Boolean(currentProduct?.model_max_url)
                    const hasAnyModel = hasGlb || hasMax

                    return (
                      <div
                        ref={modelFormatMenuRef}
                        className={`product-model-download${hasAnyModel ? '' : ' product-model-download--disabled'}${isModelFormatMenuOpen ? ' is-open' : ''}`}
                      >
                        <button
                          type="button"
                          className="product-details-link product-model-download-trigger"
                          disabled={!hasAnyModel}
                          aria-expanded={isModelFormatMenuOpen}
                          aria-haspopup="menu"
                          onClick={() => hasAnyModel && setIsModelFormatMenuOpen((open) => !open)}
                        >
                          <span className="product-details-link-bracket">[ </span>
                          <span>Загрузить 3D модель</span>
                          <svg
                            className="product-model-download-chevron"
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                          >
                            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span className="product-details-link-bracket"> ]</span>
                        </button>

                        {isModelFormatMenuOpen && hasAnyModel && (
                          <div className="product-model-download-menu" role="menu">
                            {hasGlb && (
                              <a
                                href={currentProduct.model_url}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="product-model-download-option"
                                role="menuitem"
                                onClick={() => setIsModelFormatMenuOpen(false)}
                              >
                                GLB
                              </a>
                            )}
                            {hasMax && (
                              <a
                                href={currentProduct.model_max_url}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="product-model-download-option"
                                role="menuitem"
                                onClick={() => setIsModelFormatMenuOpen(false)}
                              >
                                MAX
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Просмотр изображений в полноэкранном режиме */}
      {isImageViewerOpen && createPortal(
        <div className="image-viewer-overlay" onClick={handleCloseImageViewer}>
          <button
            className="image-viewer-close"
            onClick={handleCloseImageViewer}
            aria-label="Закрыть"
          >
            <div className="image-viewer-close-icon">
              <span></span>
              <span></span>
            </div>
          </button>
          <div className="image-viewer-content" onClick={(e) => e.stopPropagation()}>
            {viewerImages.length > 1 && (
              <>
                <button
                  className="image-viewer-nav image-viewer-prev"
                  onClick={handlePrevImage}
                  aria-label="Предыдущее изображение"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button
                  className="image-viewer-nav image-viewer-next"
                  onClick={handleNextImage}
                  aria-label="Следующее изображение"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 18L15 12L9 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </>
            )}
            <img
              src={viewerImages[currentImageIndex]}
              alt={`Изображение ${currentImageIndex + 1} из ${viewerImages.length}`}
              className="image-viewer-img"
            />
            {viewerImages.length > 1 && (
              <div className="image-viewer-counter">
                {currentImageIndex + 1} / {viewerImages.length}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Модальное окно проекта */}
      {(isProjectModalOpen || isProjectModalClosing) && createPortal(
        <div 
          className={`project-modal-overlay ${isProjectModalClosing ? 'closing' : ''}`}
          onClick={handleCloseProjectModal}
        >
          <div 
            className={`project-modal ${isProjectModalClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="project-modal-close"
              onClick={handleCloseProjectModal}
              aria-label="Закрыть"
            >
              <div className="project-modal-close-icon">
                <span></span>
                <span></span>
              </div>
            </button>
            <div className="padding-global">
              <div className="container-large">
                <div className="project-modal-content">
                  {selectedProject && (
                    <>
                      <div className="project-modal-left">
                        {/* Название проекта */}
                        <h2 className="project-modal-title">{selectedProject.name}</h2>
                        
                        {/* Информация о проекте */}
                        <div className="project-modal-info">
                          {/* Кресло */}
                          <div className="project-modal-info-item">
                            <p className="project-modal-info-label">Кресло</p>
                            {currentProduct ? (
                              <p className="project-modal-info-value project-modal-info-value-white">
                                {currentProduct.name}
                              </p>
                            ) : (
                              <p className="project-modal-info-value">не указано</p>
                            )}
                          </div>
                          
                          {/* Количество мест */}
                          <div className="project-modal-info-item">
                            <p className="project-modal-info-label">Количество мест</p>
                            <p className="project-modal-info-value project-modal-info-value-white">
                              {selectedProject.seats_count || 'не указано'}
                            </p>
                          </div>
                          
                          {/* Вариант обивки */}
                          <div className="project-modal-info-item">
                            <p className="project-modal-info-label">Вариант обивки</p>
                            <p className="project-modal-info-value project-modal-info-value-white">
                              {selectedProject.upholstery_variant || 'не указано'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Изображения проекта */}
                        {selectedProject.images && selectedProject.images.length > 0 && (
                          <div className="project-imgs-wrapper">
                            {selectedProject.images.slice(0, 3).map((image, index) => {
                              const isLastVisible = index === 2 && selectedProject.images.length > 3
                              const remainingCount = selectedProject.images.length - 3
                              
                              return (
                                <div
                                  key={index}
                                  className="project-modal-image-container"
                                  onClick={() => handleOpenImageViewer(selectedProject.images, index)}
                                >
                                  <img
                                    src={image}
                                    alt={`${selectedProject.name} - изображение ${index + 1}`}
                                    className="project-modal-image"
                                    onError={(e) => {
                                      e.target.style.display = 'none'
                                    }}
                                  />
                                  {isLastVisible && (
                                    <div className="project-modal-image-overlay">
                                      <span className="project-modal-image-count">+{remainingCount}</span>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      
                      <div className="project-modal-right">
                        {selectedProject.description && (
                          <div 
                            className="project-modal-description"
                            dangerouslySetInnerHTML={{ __html: selectedProject.description }}
                          />
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default Product

