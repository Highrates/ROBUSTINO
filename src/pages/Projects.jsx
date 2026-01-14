import { useEffect, useRef, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import Navbar from '@components/product/Navbar'
import Footer from '@components/common/Footer'
import ContactsSection from '@components/common/ContactsSection'
import useProjectsStore from '@store/projectsStore'
import Loader from '@components/common/Loader'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger)

const Projects = () => {
  const { projects, loading, error, fetchProjects } = useProjectsStore()
  const allProjectsSectionRef = useRef(null)
  const allProjectsTitleWrapperRef = useRef(null)
  const secondColumnRef = useRef(null)
  const allProjectsListRef = useRef(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isModalClosing, setIsModalClosing] = useState(false)
  const modalCloseTimerRef = useRef(null)
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [viewerImages, setViewerImages] = useState([])

  // Скроллим вверх при монтировании страницы
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    // Дополнительно на случай, если первый вызов не сработал
    const timeoutId = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [])

  // Загружаем проекты при монтировании
  useEffect(() => {
    fetchProjects(true) // Принудительная загрузка
  }, [fetchProjects])

  // Проекты не имеют поля status, используем все проекты
  const publishedProjects = useMemo(
    () => projects,
    [projects]
  )

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

  // Анимация появления заголовка
  useEffect(() => {
    if (allProjectsSectionRef.current) {
      // Устанавливаем начальное состояние сразу при монтировании
      const titleWrapper = allProjectsTitleWrapperRef.current
      if (titleWrapper) {
        gsap.set(titleWrapper, {
          opacity: 0,
          y: 40
        })
      }

      // Небольшая задержка, чтобы убедиться, что DOM обновлен
      const timeoutId = setTimeout(() => {
        // Обновляем ScrollTrigger
        ScrollTrigger.refresh()

        // Анимация заголовка
        if (titleWrapper) {
          gsap.to(titleWrapper, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            delay: 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: allProjectsSectionRef.current,
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
  }, [publishedProjects.length, loading])

  // Анимация для project-with-pic - после загрузки проектов
  useEffect(() => {
    if (publishedProjects.length > 0 && allProjectsSectionRef.current && secondColumnRef.current) {
      // Небольшая задержка, чтобы убедиться, что DOM обновлен
      const timeoutId = setTimeout(() => {
        const projectWithPic = secondColumnRef.current.querySelectorAll('.project-with-pic')
        
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
          gsap.to(projectWithPic, {
            opacity: 1,
            x: 0,
            scale: 1,
            duration: 0.8,
            stagger: 0.15,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: allProjectsSectionRef.current,
              start: 'top 80%',
              toggleActions: 'play none none none'
            }
          })
        }
      }, 150)

      return () => {
        clearTimeout(timeoutId)
      }
    }
  }, [publishedProjects.length, loading])

  // Анимация для project-item - после загрузки проектов
  useEffect(() => {
    if (publishedProjects.length > 3 && allProjectsSectionRef.current && allProjectsListRef.current) {
      // Небольшая задержка, чтобы убедиться, что DOM обновлен
      const timeoutId = setTimeout(() => {
        const projectItems = allProjectsListRef.current.querySelectorAll('.project-item')
        
        if (projectItems.length > 0) {
          // Устанавливаем начальное состояние
          gsap.set(projectItems, {
            opacity: 0,
            y: 30
          })

          // Обновляем ScrollTrigger
          ScrollTrigger.refresh()

          // Анимация появления
          gsap.to(projectItems, {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.08,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: allProjectsSectionRef.current,
              start: 'top 80%',
              toggleActions: 'play none none none'
            }
          })
        }
      }, 150)

      return () => {
        clearTimeout(timeoutId)
      }
    }
  }, [publishedProjects.length, loading])

  return (
    <div className="projects-page relative bg-main-bg">
      <Navbar />
      
      <section ref={allProjectsSectionRef} className="projects-section">
        <div className="padding-global">
          <div className="container-large">
            <div className="all-projects-content">
              <div ref={allProjectsTitleWrapperRef} className="all-projects-title-wrapper">
                <h1 className="hero-text">РЕАЛИЗОВАННЫЕ ОБЪЕКТЫ</h1>
                <span className="all-projects-count">{publishedProjects.length}</span>
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

              {!loading && !error && publishedProjects.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-second-text text-lg">Проекты не найдены</p>
                </div>
              )}

              {!loading && !error && publishedProjects.length > 0 && (
                <div className="all-projects">
                  {/* Три project-with-pic (как в second-column на Home.jsx) */}
                  <div ref={secondColumnRef} className="second-column">
                    {publishedProjects.slice(0, 3).map((project) => (
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

                  {/* all-projects-list (вертикальный список) */}
                  <div ref={allProjectsListRef} className="all-projects-list">
                    {publishedProjects.slice(3).map((project) => (
                      <div 
                        key={project.id} 
                        className="project-item"
                        onClick={() => handleOpenModal(project)}
                      >
                        <div className="project-item-link-wrapper">
                          <div className="project-item-titles">
                            <h3 className="project-item-name">{project.name}</h3>
                            <p className="project-item-info">
                              {project.products ? (
                                <>
                                  Кресло:{' '}
                                  <span
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      window.location.href = `/product/${project.product_id}`
                                    }}
                                    className="project-item-link"
                                  >
                                    {project.products.name}
                                  </span>
                                </>
                              ) : (
                                'Кресло: не указано'
                              )}
                              {project.seats_count && (
                                <>
                                  {' · '}
                                  Количество: {project.seats_count}
                                </>
                              )}
                            </p>
                          </div>
                          <img src="/up.svg" alt="" className="project-item-icon" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      
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

      {/* Модальное окно для project-item */}
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
                                  window.location.href = `/product/${selectedProject.product_id}`
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

export default Projects
