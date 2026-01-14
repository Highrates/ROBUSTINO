import { useRef, useEffect, Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Navbar from '@components/product/Navbar'
import Footer from '@components/common/Footer'
import ContactsSection from '@components/common/ContactsSection'
import useGSAP from '@hooks/useGSAP'
import useProductsStore from '@store/productsStore'
import useProjectsStore from '@store/projectsStore'
import useArticlesStore from '@store/articlesStore'
import useFAQStore from '@store/faqStore'
import useFAQLinksStore from '@store/faqLinksStore'
import usePresentationStore from '@store/presentationStore'

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger)

const Home = () => {
  const heroTextRef = useRef(null)
  const heroImageRef = useRef(null)
  const secondTitleRef = useRef(null)
  const linkBlockRef = useRef(null)
  const aboutTextRef = useRef(null)
  const aboutSectionRef = useRef(null)
  const productsSectionRef = useRef(null)
  const productsTopRef = useRef(null)
  const productsScrollRef = useRef(null)
  const productsScrollContainerRef = useRef(null)
  const productsScrollArrowRef = useRef(null)
  const productsLinkBlockRef = useRef(null)
  const productCardsAnimationRef = useRef(null)
  const projectsSectionRef = useRef(null)
  const projectsTopRef = useRef(null)
  const projectsLinkBlockRef = useRef(null)
  const projectsDescriptionRef = useRef(null)
  const projectsListRef = useRef(null)
  const articlesSectionRef = useRef(null)
  const articlesTopRef = useRef(null)
  const articlesLinkBlockRef = useRef(null)
  const articlesListRef = useRef(null)
  const faqSectionRef = useRef(null)
  const faqTitleRef = useRef(null)
  const faqContentRef = useRef(null)
  const faqLinksWrapperRef = useRef(null)
  const faqQuestionsWrapperRef = useRef(null)
  
  // Products store
  const { products, fetchProducts } = useProductsStore()
  
  // Projects store
  const { projects, fetchProjects } = useProjectsStore()
  
  // Articles store
  const { articles, fetchArticles } = useArticlesStore()
  
  // FAQ store
  const { faqs, fetchFAQs } = useFAQStore()
  
  // FAQ Links store
  const { links: faqLinks, fetchFAQLinks } = useFAQLinksStore()
  
  // Presentation store
  const { presentation, fetchPresentation } = usePresentationStore()
  
  // FAQ accordion state
  const [openFAQId, setOpenFAQId] = useState(null)
  
  const toggleFAQ = (id) => {
    setOpenFAQId(openFAQId === id ? null : id)
  }

  // Modal state
  const [selectedProject, setSelectedProject] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isModalClosing, setIsModalClosing] = useState(false)
  const modalCloseTimerRef = useRef(null)
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [viewerImages, setViewerImages] = useState([])

  // Открытие модального окна
  const handleOpenModal = (project) => {
    setSelectedProject(project)
    setIsModalClosing(false)
    setIsModalOpen(true)
  }

  // Закрытие модального окна с анимацией
  const handleCloseModal = () => {
    if (modalCloseTimerRef.current) {
      clearTimeout(modalCloseTimerRef.current)
    }
    
    setIsModalClosing(true)
    modalCloseTimerRef.current = setTimeout(() => {
      setIsModalOpen(false)
      setIsModalClosing(false)
      setSelectedProject(null)
      modalCloseTimerRef.current = null
    }, 400) // Длительность анимации
  }

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
    fetchProducts(true)
  }, [fetchProducts])
  
  // Загружаем FAQ при монтировании
  useEffect(() => {
    fetchFAQs(true)
  }, [fetchFAQs])
  
  // Загружаем FAQ Links при монтировании
  useEffect(() => {
    fetchFAQLinks(true)
  }, [fetchFAQLinks])
  
  // Загружаем Presentation при монтировании
  useEffect(() => {
    fetchPresentation(true)
  }, [fetchPresentation])

  // Загружаем проекты при монтировании
  useEffect(() => {
    fetchProjects(true)
  }, [fetchProjects])

  // Загружаем статьи при монтировании
  useEffect(() => {
    fetchArticles(true)
  }, [fetchArticles])
  
  // Обработка скролла к секции contacts при загрузке с хешем #contacts
  useEffect(() => {
    const handleHashScroll = () => {
      if (window.location.hash === '#contacts') {
        // Небольшая задержка для того, чтобы DOM успел обновиться
        setTimeout(() => {
          const contactsSection = document.getElementById('contacts')
          if (contactsSection) {
            contactsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 100)
      }
    }

    // Проверяем при монтировании
    handleHashScroll()

    // Также обрабатываем событие hashchange
    window.addEventListener('hashchange', handleHashScroll)

    return () => {
      window.removeEventListener('hashchange', handleHashScroll)
    }
  }, [])
  
  // Фильтруем только опубликованные продукты
  const publishedProducts = products.filter(product => product.status === 'published')

  // Отслеживание скролла для фиксации иконки
  useEffect(() => {
    if (publishedProducts.length === 0) return

    let cleanup = null

    // Небольшая задержка, чтобы убедиться, что DOM обновлен
    const timeoutId = setTimeout(() => {
      const container = productsScrollContainerRef.current
      const arrow = productsScrollArrowRef.current
      
      if (!container || !arrow) return

      const updateArrowPosition = () => {
        const containerRect = container.getBoundingClientRect()
        // Позиция иконки относительно контейнера (между 3 и 4 карточкой)
        const arrowLeft = 300 * 3 + 80 * 3 + 150 - 34.5 - 186 + 120
        const leftPosition = containerRect.left + arrowLeft
        const topPosition = containerRect.top + containerRect.height / 2
        
        // Обновляем обе позиции (горизонтальную и вертикальную)
        arrow.style.left = `${leftPosition}px`
        arrow.style.top = `${topPosition}px`
        // Убеждаемся, что стрелочка видна (не трогаем opacity - это контролирует GSAP анимация)
        arrow.style.display = 'block'
        arrow.style.visibility = 'visible'
      }

      // Устанавливаем начальную позицию
      updateArrowPosition()
      
      // Обновляем позицию при скролле контейнера
      container.addEventListener('scroll', updateArrowPosition)
      // Обновляем позицию при скролле страницы
      window.addEventListener('scroll', updateArrowPosition, true)
      // Обновляем позицию при изменении размера окна
      window.addEventListener('resize', updateArrowPosition)

      cleanup = () => {
        container.removeEventListener('scroll', updateArrowPosition)
        window.removeEventListener('scroll', updateArrowPosition, true)
        window.removeEventListener('resize', updateArrowPosition)
      }
    }, 200) // Задержка для обновления DOM

    return () => {
      clearTimeout(timeoutId)
      if (cleanup) cleanup()
    }
  }, [publishedProducts.length])

  // Анимация карточек товаров и стрелочки - после загрузки продуктов
  useEffect(() => {
    if (publishedProducts.length > 0 && productsSectionRef.current) {
      // Убиваем предыдущую анимацию, если она существует
      if (productCardsAnimationRef.current) {
        if (productCardsAnimationRef.current.scrollTrigger) {
          productCardsAnimationRef.current.scrollTrigger.kill()
        }
        productCardsAnimationRef.current.kill()
        productCardsAnimationRef.current = null
      }

      // Небольшая задержка, чтобы убедиться, что DOM обновлен
      const timeoutId = setTimeout(() => {
        const productCards = productsSectionRef.current.querySelectorAll('.product-card')
        const arrow = productsScrollArrowRef.current
        
        // Устанавливаем начальное состояние стрелочки (скрыта)
        if (arrow) {
          gsap.set(arrow, {
            opacity: 0
          })
        }
        
        if (productCards.length > 0) {
          // Сначала устанавливаем начальное состояние
          gsap.set(productCards, {
            opacity: 0,
            x: 40,
            scale: 0.95
          })

          // Обновляем ScrollTrigger
          ScrollTrigger.refresh()

          // Анимация появления с начальным состоянием
          const animation = gsap.to(productCards, {
            opacity: 1,
            x: 0,
            scale: 1,
            duration: 0.8,
            stagger: 0.25, // Последовательное появление - увеличен интервал для большей заметности
            ease: 'power2.out',
            scrollTrigger: {
              trigger: productsSectionRef.current,
              start: 'top 80%',
              toggleActions: 'play none none none',
              // Если секция уже видна, запускаем анимацию сразу
              once: false
            }
          })

          // Сохраняем анимацию в ref
          productCardsAnimationRef.current = animation
        }

        // Анимация стрелочки - появляется после всех карточек
        if (arrow) {
          const cardsCount = productCards.length
          const staggerDelay = 0.25
          const cardDuration = 0.8
          const arrowDelay = (cardsCount - 1) * staggerDelay + cardDuration + 0.3
          
          // Анимация появления после всех карточек (тот же ScrollTrigger)
          gsap.to(arrow, {
            opacity: 1,
            duration: 0.6,
            delay: arrowDelay,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: productsSectionRef.current,
              start: 'top 80%',
              toggleActions: 'play none none none'
            }
          })
        }
      }, 150) // Небольшая задержка для обновления DOM

      return () => {
        clearTimeout(timeoutId)
        if (productCardsAnimationRef.current) {
          if (productCardsAnimationRef.current.scrollTrigger) {
            productCardsAnimationRef.current.scrollTrigger.kill()
          }
          productCardsAnimationRef.current.kill()
          productCardsAnimationRef.current = null
        }
      }
    }
  }, [publishedProducts.length, products.length])

  // Анимация появления элементов (Параллакс Reveal)
  useGSAP(() => {
    // Текст: slide up с fade (из-под экрана)
    if (heroTextRef.current) {
      gsap.from(heroTextRef.current, {
        opacity: 0,
        y: 60,
        duration: 1,
        delay: 0.2,
        ease: 'power3.out'
      })
    }

    // Изображение: slide up с fade и небольшим масштабированием
    if (heroImageRef.current) {
      // Отдельная анимация для opacity (быстрее)
      gsap.fromTo(heroImageRef.current, 
        { opacity: 0 },
        { 
          opacity: 1, 
          duration: 0.5,
          delay: 0.4,
          ease: 'power2.out'
        }
      )
      
      // Анимация движения и масштаба 
      gsap.from(heroImageRef.current, {
        y: 80,
        scale: 0.9,
        duration: 1.2,
        delay: 0.4,
        ease: 'power3.out'
      })
    }

    // Анимации для About Section - срабатывают при скролле
    if (aboutSectionRef.current) {
      // 1. Second Title - slide up + fade
      if (secondTitleRef.current) {
        gsap.from(secondTitleRef.current, {
          opacity: 0,
          y: 40,
          duration: 0.8,
          delay: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: aboutSectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        })
      }

      // Link Block - такая же анимация как Second Title
      if (linkBlockRef.current) {
        gsap.from(linkBlockRef.current, {
          opacity: 0,
          y: 40,
          duration: 0.8,
          delay: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: aboutSectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        })
      }

      // 2. About Text - slide up + fade (с задержкой)
      if (aboutTextRef.current) {
        gsap.from(aboutTextRef.current, {
          opacity: 0,
          y: 80,
          duration: 1.2,
          delay: 0.5,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: aboutSectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        })
      }

      // 3. Inline Images - отдельная анимация с stagger
      const inlineIcons = aboutSectionRef.current.querySelectorAll('.inline-icon')
      if (inlineIcons.length > 0) {
        gsap.from(inlineIcons, {
          opacity: 0,
          scale: 0.8,
          duration: 0.8,
          delay: 0.7,
          stagger: 0.1, // Последовательное появление
          ease: 'power2.out',
          scrollTrigger: {
            trigger: aboutSectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        })
      }
    }

    // Анимации для Products Section - срабатывают при скролле
    if (productsSectionRef.current) {
      // 1. Products Top (заголовок "Продукция" + описание) - slide up + fade
      if (productsTopRef.current) {
        gsap.from(productsTopRef.current, {
          opacity: 0,
          y: 60,
          duration: 1,
          delay: 0.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: productsSectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        })
      }

      // Link Block в Products Top - такая же анимация
      if (productsLinkBlockRef.current) {
        gsap.from(productsLinkBlockRef.current, {
          opacity: 0,
          y: 60,
          duration: 1,
          delay: 0.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: productsSectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        })
      }

      // 2. Products Scroll Container - slide up + fade (с задержкой)
      if (productsScrollRef.current) {
        gsap.from(productsScrollRef.current, {
          opacity: 0,
          y: 80,
          duration: 1.2,
          delay: 0.5,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: productsSectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        })
      }

      // 3. Product Cards - анимация будет настроена отдельно после загрузки продуктов

      // 4. Next Arrow - анимация будет настроена отдельно после загрузки продуктов
    }

    // Анимации для Projects Section - срабатывают при скролле
    if (projectsSectionRef.current) {
      // 1. Second Title + Link Block - slide up + fade
      if (projectsTopRef.current) {
        gsap.from(projectsTopRef.current, {
          opacity: 0,
          y: 60,
          duration: 1,
          delay: 0.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: projectsSectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        })
      }

      // Link Block "Смотреть все" - такая же анимация
      if (projectsLinkBlockRef.current) {
        gsap.from(projectsLinkBlockRef.current, {
          opacity: 0,
          y: 60,
          duration: 1,
          delay: 0.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: projectsSectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        })
      }

      // 2. Projects Description Text - slide up + fade
      if (projectsDescriptionRef.current) {
        gsap.from(projectsDescriptionRef.current, {
          opacity: 0,
          y: 80,
          duration: 1.2,
          delay: 0.5,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: projectsSectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        })
      }

      // 3. Первая колонка (first-column) - цифры с stagger
      const firstColumnTitles = projectsSectionRef.current.querySelectorAll('.first-column-titles')
      if (firstColumnTitles.length > 0) {
        gsap.from(firstColumnTitles, {
          opacity: 0,
          y: 40,
          duration: 0.8,
          delay: 0.7,
          stagger: 0.15,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: projectsSectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        })
      }

          // 4. Вторая колонка (project-with-pic) - анимация будет настроена отдельно после загрузки проектов
          // 5. Третья колонка (project-link) - анимация будет настроена отдельно после загрузки проектов
    }

    // Анимации для Articles Section - срабатывают при скролле
    if (articlesSectionRef.current) {
      // 1. Second Title + Link Block - slide up + fade
      if (articlesTopRef.current) {
        gsap.from(articlesTopRef.current, {
          opacity: 0,
          y: 60,
          duration: 1,
          delay: 0.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: articlesSectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        })
      }

      // Link Block "Смотреть все" - такая же анимация
      if (articlesLinkBlockRef.current) {
        gsap.from(articlesLinkBlockRef.current, {
          opacity: 0,
          y: 60,
          duration: 1,
          delay: 0.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: articlesSectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        })
      }

      // 2. Articles List - анимация будет настроена отдельно после загрузки статей
    }

    // Анимации для FAQ Section - срабатывают при скролле
    if (faqSectionRef.current) {
      // 1. Заголовок "FAQ" - slide up + fade
      if (faqTitleRef.current) {
        gsap.from(faqTitleRef.current, {
          opacity: 0,
          y: 60,
          duration: 1,
          delay: 0.2,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: faqSectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        })
      }

      // 2. Links Wrapper - slide up + fade (слева)
      if (faqLinksWrapperRef.current) {
        gsap.from(faqLinksWrapperRef.current, {
          opacity: 0,
          y: 40,
          duration: 0.8,
          delay: 0.5,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: faqSectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        })
      }

      // 3. Questions Wrapper - slide up + fade (справа, анимация будет настроена отдельно после загрузки FAQ)
    }

    // Анимации для Contacts Section - срабатывают при скролле
    const contactsSection = document.getElementById('contacts')
    if (contactsSection) {
      const contactsWrapper = contactsSection.querySelector('.contacts-wrapper')
      const contactsGrid = contactsSection.querySelector('.contacts-grid')
      
      // 1. Contacts Wrapper - slide up + fade
      if (contactsWrapper) {
        gsap.from(contactsWrapper, {
          opacity: 0,
          y: 40,
          duration: 0.8,
          delay: 0.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: contactsSection,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        })
      }

      // 2. Contacts Grid - slide up + fade
      if (contactsGrid) {
        gsap.from(contactsGrid, {
          opacity: 0,
          y: 40,
          duration: 0.8,
          delay: 0.5,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: contactsSection,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        })
      }
    }
  }, [])

  // Анимация для второй и третьей колонок projects - после загрузки проектов
  useEffect(() => {
    if (projects.length > 0 && projectsSectionRef.current) {
      // Небольшая задержка, чтобы убедиться, что DOM обновлен
      const timeoutId = setTimeout(() => {
        // 4. Вторая колонка (project-with-pic) - карточки с изображениями
        const projectWithPic = projectsSectionRef.current.querySelectorAll('.project-with-pic')
        
        if (projectWithPic.length > 0) {
          // Устанавливаем начальное состояние
          gsap.set(projectWithPic, {
            opacity: 0,
            x: 40,
            scale: 0.95
          })

          // Обновляем ScrollTrigger
          ScrollTrigger.refresh()

          // Анимация появления
          const animation1 = gsap.to(projectWithPic, {
            opacity: 1,
            x: 0,
            scale: 1,
            duration: 0.8,
            stagger: 0.15,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: projectsSectionRef.current,
              start: 'top 80%',
              toggleActions: 'play none none none'
            }
          })

          // Сохраняем для cleanup
          if (!window._projectsAnimations) {
            window._projectsAnimations = []
          }
          window._projectsAnimations.push(animation1)
        }

        // 5. Третья колонка (project-link) - список проектов
        const projectLinks = projectsSectionRef.current.querySelectorAll('.project-link')
        
        if (projectLinks.length > 0) {
          // Устанавливаем начальное состояние
          gsap.set(projectLinks, {
            opacity: 0,
            y: 30
          })

          // Обновляем ScrollTrigger
          ScrollTrigger.refresh()

          // Анимация появления
          const animation2 = gsap.to(projectLinks, {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.08,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: projectsSectionRef.current,
              start: 'top 80%',
              toggleActions: 'play none none none'
            }
          })

          // Сохраняем для cleanup
          if (!window._projectsAnimations) {
            window._projectsAnimations = []
          }
          window._projectsAnimations.push(animation2)
        }
      }, 150)

      return () => {
        clearTimeout(timeoutId)
        if (window._projectsAnimations) {
          window._projectsAnimations.forEach(animation => {
            if (animation && animation.scrollTrigger) {
              animation.scrollTrigger.kill()
            }
            if (animation && animation.kill) {
              animation.kill()
            }
          })
          window._projectsAnimations = []
        }
      }
    }
  }, [projects.length])

  // Анимация для карточек статей - после загрузки статей
  useEffect(() => {
    if (articles.length > 0 && articlesSectionRef.current) {
      // Убиваем предыдущую анимацию, если она существует
      if (window._articlesAnimation) {
        window._articlesAnimation.forEach(animation => {
          if (animation && animation.scrollTrigger) {
            animation.scrollTrigger.kill()
          }
          animation.kill()
        })
        window._articlesAnimation = []
      }

      // Небольшая задержка, чтобы убедиться, что DOM обновлен
      const timeoutId = setTimeout(() => {
        const articlesElements = articlesSectionRef.current.querySelectorAll('.article')
        
        if (articlesElements.length > 0) {
          // Устанавливаем начальное состояние
          gsap.set(articlesElements, {
            opacity: 0,
            y: 60
          })

          // Обновляем ScrollTrigger
          ScrollTrigger.refresh()

          // Анимация появления
          const animation = gsap.to(articlesElements, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: articlesSectionRef.current,
              start: 'top 80%',
              toggleActions: 'play none none none'
            }
          })

          // Сохраняем для cleanup
          if (!window._articlesAnimation) {
            window._articlesAnimation = []
          }
          window._articlesAnimation.push(animation)
        }
      }, 150)

      return () => {
        clearTimeout(timeoutId)
        if (window._articlesAnimation) {
          window._articlesAnimation.forEach(animation => {
            if (animation && animation.scrollTrigger) {
              animation.scrollTrigger.kill()
            }
            if (animation && animation.kill) {
              animation.kill()
            }
          })
          window._articlesAnimation = []
        }
      }
    }
  }, [articles.length])

  // Блокируем скролл когда модальное окно открыто
  useEffect(() => {
    if ((isModalOpen && !isModalClosing) || isImageViewerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isModalOpen, isModalClosing, isImageViewerOpen])

  // Обработка клавиши Escape для закрытия модального окна
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isModalOpen) {
        handleCloseModal()
      }
    }
    if (isModalOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isModalOpen])

  // Cleanup: очищаем таймер при размонтировании
  useEffect(() => {
    return () => {
      if (modalCloseTimerRef.current) {
        clearTimeout(modalCloseTimerRef.current)
        modalCloseTimerRef.current = null
      }
    }
  }, [])

  // Обработка клавиш для навигации по изображениям
  useEffect(() => {
    if (!isImageViewerOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        handleNextImage()
      } else if (e.key === 'ArrowLeft') {
        handlePrevImage()
      } else if (e.key === 'Escape') {
        handleCloseImageViewer()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isImageViewerOpen, viewerImages.length])

  // Анимация для questions wrapper - после загрузки FAQ
  useEffect(() => {
    if (faqs.length > 0 && faqSectionRef.current && faqQuestionsWrapperRef.current) {
      // Убиваем предыдущую анимацию, если она существует
      if (window._faqQuestionsAnimation) {
        if (window._faqQuestionsAnimation.scrollTrigger) {
          window._faqQuestionsAnimation.scrollTrigger.kill()
        }
        window._faqQuestionsAnimation.kill()
        window._faqQuestionsAnimation = null
      }

      // Небольшая задержка, чтобы убедиться, что DOM обновлен
      const timeoutId = setTimeout(() => {
        // Устанавливаем начальное состояние
        gsap.set(faqQuestionsWrapperRef.current, {
          opacity: 0,
          y: 40
        })

        // Обновляем ScrollTrigger
        ScrollTrigger.refresh()

        // Анимация появления
        const animation = gsap.to(faqQuestionsWrapperRef.current, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          delay: 0.7,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: faqSectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none none'
          }
        })

        // Сохраняем для cleanup
        window._faqQuestionsAnimation = animation
      }, 150)

      return () => {
        clearTimeout(timeoutId)
        if (window._faqQuestionsAnimation) {
          if (window._faqQuestionsAnimation.scrollTrigger) {
            window._faqQuestionsAnimation.scrollTrigger.kill()
          }
          if (window._faqQuestionsAnimation.kill) {
            window._faqQuestionsAnimation.kill()
          }
          window._faqQuestionsAnimation = null
        }
      }
    }
  }, [faqs.length])

  return (
    <div className="home-page relative bg-main-bg" style={{ zIndex: 1 }}>
      <Navbar />
      
      {/* Main Section - 100vh */}
      <section className="home-section flex flex-col" style={{ minHeight: '100vh', zIndex: 1 }}>
        <div className="padding-global flex-1 flex flex-col">
          <div className="container-large flex-1 flex flex-col">
            {/* Hero Content */}
            <div className="hero-content relative flex flex-col justify-start items-center py-14">
              {/* Текст */}
              <h1 
                ref={heroTextRef}
                className="hero-text relative text-main-text uppercase"
                style={{
                  fontFamily: 'Commissioner, sans-serif',
                  fontWeight: 450,
                  letterSpacing: '-0.04em', // -4%
                  textAlign: 'center',
                  zIndex: 10
                }}
              >
                {/* Мобильная версия: "И" на второй строке */}
                <span className="md:hidden">
                  Надежные<br />
                  и Стильные<br />
                  кресла для залов -<br />
                  Robustino
                </span>
                {/* Десктоп версия: оригинальное разбиение */}
                <span className="hidden md:inline">
                Надежные и Стильные<br />
                кресла для залов -<br />
                Robustino
                </span>
              </h1>
              
              {/* Изображение */}
              <img 
                ref={heroImageRef}
                src="/hero-img.png" 
                alt="Robustino кресла"
                className="hero-image absolute md:top-[45%] top-[55%]"
                style={{
                  zIndex: 20,
                  objectFit: 'cover',
                  left: '50%',
                  transform: 'translateX(-50%)'
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section ref={aboutSectionRef} style={{ minHeight: '100vh' }}>
        <div className="padding-global">
          <div className="container-large">
            <div className="about-content flex flex-col">
              <div className="second-title-wrapper flex justify-between items-center">
                <h4 ref={secondTitleRef} className="second-title">О Robustino</h4>
                <Link ref={linkBlockRef} to="/about" className="link-block flex items-center gap-3">
                  <span className="second-title">Больше о нас</span>
                  <img src="/send.svg" alt="" className="send-icon" />
                </Link>
              </div>
              
              <h1 ref={aboutTextRef} className="about-text">
                {/* Мобильная версия: без переноса "И" */}
                <span className="md:hidden">
                  БЛАГОДАРЯ СОВРЕМЕННЫМ
                  <img className="inline-icon" src="/about-pic1.png" alt="" />
                  ТЕХНОЛОГИЯМ И
                  <img className="inline-icon" src="/about-pic2.png" alt="" />
                  УНИКАЛЬНЫМ МЕТОДАМ ПРОИЗВОДСТВА
                  НАШИ КРЕСЛА СОЧЕТАЮТ ВЫСОКОЕ КАЧЕСТВО,
                  КОМФОРТ И
                  <img className="inline-icon" src="/about-pic1.png" alt="" />
                  БЕЗОПАСНОСТЬ ПРИ РАЗУМНОЙ СТОИМОСТИ
                </span>
                {/* Десктоп версия: "И" на второй строке */}
                <span className="hidden md:inline">
                  БЛАГОДАРЯ СОВРЕМЕННЫМ
                  <img className="inline-icon" src="/about-pic1.png" alt="" />
                  ТЕХНОЛОГИЯМ<br />
                  И
                  <img className="inline-icon" src="/about-pic2.png" alt="" />
                  УНИКАЛЬНЫМ МЕТОДАМ ПРОИЗВОДСТВА
                  НАШИ КРЕСЛА СОЧЕТАЮТ ВЫСОКОЕ КАЧЕСТВО,
                  КОМФОРТ И
                  <img className="inline-icon" src="/about-pic1.png" alt="" />
                  БЕЗОПАСНОСТЬ ПРИ РАЗУМНОЙ СТОИМОСТИ
                </span>
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section ref={productsSectionRef} className="section-products" style={{ minHeight: '100vh' }}>
        <div className="padding-top-bottom">
          <div ref={productsTopRef} className="products-top">
            <div className="padding-global">
              <div className="container-large">
                <div className="second-title-wrapper flex justify-between items-center">
                  <div className="products-title-block flex items-center gap-14">
                    <h4 className="second-title">Продукция</h4>
                    <p className="products-description">
                      Мы производим и торгуем мебелью с 2007 года. Проектируем офисные и общественные помещения, в том числе актовые, театральные, конференц, кинозалы, аэровокзалы, медицинские учреждения.
                    </p>
                  </div>
                  <Link ref={productsLinkBlockRef} to="/products" className="link-block flex items-center gap-3">
                    <span className="second-title">Смотреть все</span>
                    <img src="/send.svg" alt="" className="send-icon" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
          
          {/* Products horizontal scroll */}
          <div ref={productsScrollContainerRef} className="products-scroll-container">
            <div ref={productsScrollRef} className="products-scroll-wrapper">
              {publishedProducts.slice(0, 10).map((product, index) => (
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
            {/* Иконка прокрутки - вне wrapper для фиксации */}
            <img 
              ref={productsScrollArrowRef}
              src="/next.svg" 
              alt="Прокрутить слайдер"
              className="products-scroll-arrow"
              style={{ opacity: 0 }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (productsScrollContainerRef.current) {
                  // Прокручиваем на ширину одной карточки + gap (300px + 80px = 380px)
                  productsScrollContainerRef.current.scrollBy({
                    left: 380,
                    behavior: 'smooth'
                  })
                }
              }}
            />
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section ref={projectsSectionRef} className="section-projects" style={{ minHeight: '90vh' }}>
        <div className="padding-global">
          <div className="container-large">
            <div className="projects flex flex-col gap-[86px]">
              <div className="second-title-wrapper flex justify-between items-center">
                <h4 ref={projectsTopRef} className="second-title">Реализованные проекты</h4>
                <Link ref={projectsLinkBlockRef} to="/projects" className="link-block flex items-center gap-3">
                  <span className="second-title">Смотреть все</span>
                  <img src="/send.svg" alt="" className="send-icon" />
                </Link>
              </div>
              <div className="projects-content flex flex-col gap-14">
                <p ref={projectsDescriptionRef} className="projects-description-text">
                  К 2025 году мы реализовали более 100 проектов в разных регионах России. Среди них Большой Театр 
                  в Москве, Мариинский театр Санкт-Петербурга, Новосибирский НОВАТ и многие другие объекты
                </p>
                <div ref={projectsListRef} className="projects-list">
                  {/* Первая колонка */}
                  <div className="projects-list-column first-column-wrapper">
                    <div className="first-column flex flex-col gap-10">
                      <div className="first-column-titles flex flex-col gap-3">
                        <span className="first-column-number">1000+</span>
                        <p className="product-type">реализованных объектов</p>
                      </div>
                      <div className="first-column-titles flex flex-col gap-3">
                        <span className="first-column-number">1728</span>
                        <p className="product-type">произведенных кресел</p>
                      </div>
                    </div>
                  </div>
                  {/* Вторая колонка */}
                  <div className="projects-list-column second-column-wrapper">
                    <div className="second-column">
                      {projects.slice(0, 3).map((project) => (
                        <div
                          key={project.id}
                          className="project-with-pic"
                          onClick={() => handleOpenModal(project)}
                          style={{ cursor: 'pointer' }}
                        >
                          {project.images && project.images.length > 0 && project.images[0] ? (
                            <img
                              src={project.images[0]}
                              alt={project.name}
                              className="project-image"
                              onError={(e) => {
                                e.target.style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="project-image bg-second-bg flex items-center justify-center">
                              <span className="text-second-text text-sm">Нет изображения</span>
                            </div>
                          )}
                          <h3 className="project-name">{project.name}</h3>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Третья колонка */}
                  <div className="projects-list-column third-column-wrapper">
                    <div className="third-column">
                      <p className="product-type">реализованные объекты</p>
                      <div className="projects-list-vertical">
                        {projects.slice(3, 9).map((project) => (
                          <div
                            key={project.id}
                            className="project-link"
                            onClick={() => handleOpenModal(project)}
                            style={{ cursor: 'pointer' }}
                          >
                            <span className="project-link-name">{project.name}</span>
                            <img src="/send.svg" alt="" className="project-link-icon" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Articles Section */}
      <section ref={articlesSectionRef} className="section-articles" style={{ minHeight: '80vh' }}>
        <div className="padding-global">
          <div className="container-large">
            <div className="articles-content">
              <div className="second-title-wrapper flex justify-between items-center">
                <h4 ref={articlesTopRef} className="second-title">Новости и статьи</h4>
                <Link ref={articlesLinkBlockRef} to="/articles" className="link-block flex items-center gap-3">
                  <span className="second-title">Смотреть все</span>
                  <img src="/send.svg" alt="" className="send-icon" />
                </Link>
              </div>
              <div ref={articlesListRef} className="articles-list">
                {articles
                  .filter(article => article.status === 'published')
                  .slice(0, 4)
                  .map((article) => (
                    <Link
                      key={article.id}
                      to={`/article/${article.slug || article.id}`}
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
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section ref={faqSectionRef} className="section-FAQ" style={{ minHeight: '100vh' }}>
        <div className="padding-global">
          <div className="container-large">
            <div className="faq flex flex-col gap-[86px]" style={{ paddingTop: '56px', paddingBottom: '56px' }}>
              <h4 ref={faqTitleRef} className="second-title">FAQ</h4>
              <div ref={faqContentRef} className="faq-content flex justify-between">
                {/* Links Wrapper */}
                <div ref={faqLinksWrapperRef} className="links-wrapper flex flex-col gap-[7px]">
                  {/* Презентация */}
                  {presentation && (
                    <a 
                      href={presentation.document_url || '#'} 
                      className="faq-link"
                      target={presentation.document_url ? '_blank' : undefined}
                      rel={presentation.document_url ? 'noopener noreferrer' : undefined}
                    >
                      {presentation.name || 'Презентация кресел PDF'}
                    </a>
                  )}
                  {/* FAQ Links */}
                  {faqLinks
                    .filter(link => link.is_active === true)
                    .map((link) => (
                      link.is_internal_page ? (
                        <Link
                          key={link.id}
                          to={`/page/${link.id}`}
                          className="faq-link"
                        >
                          {link.name}
                        </Link>
                      ) : (
                        <a
                          key={link.id}
                          href={link.document_url || (link.rich_text ? '#' : '#')}
                          className="faq-link"
                          target={link.document_url ? '_blank' : undefined}
                          rel={link.document_url ? 'noopener noreferrer' : undefined}
                          onClick={(e) => {
                            if (!link.document_url && !link.rich_text) {
                              e.preventDefault()
                            }
                            // Если есть rich_text и нет документа, можно открыть модальное окно
                            if (link.rich_text && !link.document_url) {
                              e.preventDefault()
                              // Здесь можно добавить логику для отображения rich_text
                              alert(link.name) // Временное решение
                            }
                          }}
                        >
                          {link.name}
                        </a>
                      )
                    ))}
                </div>
                {/* Questions Wrapper */}
                <div ref={faqQuestionsWrapperRef} className="questions-wrapper flex flex-col gap-0">
                  {faqs
                    .filter(faq => faq.is_active === true)
                    .map((faq) => (
                      <div key={faq.id} className={`faq-item ${openFAQId === faq.id ? 'faq-item-open' : ''}`}>
                        <button 
                          className="faq-item-header"
                          onClick={() => toggleFAQ(faq.id)}
                        >
                          <h5 className="faq-question">{faq.question}</h5>
                          <img 
                            src="/up.svg" 
                            alt="" 
                            className={`faq-arrow ${openFAQId === faq.id ? 'faq-arrow-open' : ''}`}
                          />
                        </button>
                        <div 
                          className={`faq-answer-wrapper ${openFAQId === faq.id ? 'faq-answer-open' : ''}`}
                        >
                          <p className="faq-answer">{faq.answer}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contacts Section */}
      <ContactsSection />

      <Footer />

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

      {/* Модальное окно для project */}
      {(isModalOpen || isModalClosing) && createPortal(
        <div 
          className={`project-modal-overlay ${isModalClosing ? 'closing' : ''}`}
          onClick={handleCloseModal}
        >
          <div 
            className={`project-modal ${isModalClosing ? 'closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="project-modal-close"
              onClick={handleCloseModal}
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
                            {selectedProject.products ? (
                              <span
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  const productSlug = selectedProject.products?.slug || selectedProject.product_id
                                  window.location.href = `/product/${productSlug}`
                                }}
                                className="project-modal-info-value project-modal-link"
                              >
                                {selectedProject.products.name}
                              </span>
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

export default Home
