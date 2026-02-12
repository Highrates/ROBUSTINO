import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const closeTimerRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()

  // Ссылки для header (видимые всегда)
  const headerMenuItems = [
    { label: 'КРЕСЛА', path: '/products' },
    { label: 'О НАС', path: '/about' },
    { label: 'КОНТАКТЫ', path: '/#contacts' },
  ]

  // Полный список ссылок для полноэкранного меню
  const fullscreenMenuItems = [
    { label: 'Все кресла', path: '/products' },
    { label: 'Варианты отделки кресел', path: '/upholstery' },
    { label: 'О нас', path: '/about' },
    { label: 'Реализованные объекты', path: '/projects' },
    { label: 'Статьи и новости', path: '/articles' },
    { label: 'Контакты', path: '/#contacts' },
  ]

  // Функция для закрытия меню с анимацией
  const handleCloseMenu = () => {
    // Очищаем предыдущий таймер, если он существует
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
    }
    
    setIsClosing(true)
    closeTimerRef.current = setTimeout(() => {
      setIsMenuOpen(false)
      setIsClosing(false)
      closeTimerRef.current = null
    }, 400) // Длительность анимации
  }

  // Функция для открытия меню
  const handleOpenMenu = () => {
    setIsClosing(false)
    setIsMenuOpen(true)
  }

  // Блокируем скролл когда меню открыто и добавляем класс для z-index
  useEffect(() => {
    if (isMenuOpen && !isClosing) {
      document.body.style.overflow = 'hidden'
      document.body.classList.add('menu-is-open')
    } else {
      document.body.style.overflow = 'unset'
      document.body.classList.remove('menu-is-open')
    }
    return () => {
      document.body.style.overflow = 'unset'
      document.body.classList.remove('menu-is-open')
    }
  }, [isMenuOpen, isClosing])

  // Обработка клавиши Escape для закрытия меню
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isMenuOpen) {
        handleCloseMenu()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isMenuOpen, handleCloseMenu])

  // Cleanup: очищаем таймер при размонтировании компонента
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
    }
  }, [])

  // Navbar контент
  const navbarContent = (
    <nav className={`navbar ${isMenuOpen ? 'menu-open' : ''} ${isClosing ? 'menu-closing' : ''}`}>
      <div className="padding-global">
        <div className="container-large">
          <div className="nav-content self-stretch pt-4 md:pt-10 inline-flex justify-between items-center w-full">
            {/* Logo Wrap */}
            <Link 
              to="/" 
              className="logo-wrap w-[50px] h-[50px] flex items-center justify-start"
              onClick={() => isMenuOpen && handleCloseMenu()}
            >
              <img 
                src="/logo-rob.svg" 
                alt="ROBUSTINO" 
                width={36}
                height={26}
                className="object-contain"
              />
            </Link>

            {/* Menu Items - Desktop только для больших экранов */}
            <div className="menu-items hidden lg:inline-flex justify-start items-center gap-0.5">
              {headerMenuItems.map((item, index) => {
                const isActive = location.pathname === item.path
                const isAnchorLink = item.path.includes('#')
                
                const handleClick = (e) => {
                  if (isMenuOpen) {
                    handleCloseMenu()
                  }
                  
                  if (isAnchorLink) {
                    e.preventDefault()
                    const targetId = item.path.replace(/^\/?#/, '') // Получаем id секции (убираем /# или #)
                    
                    // Функция для скролла к элементу
                    const scrollToElement = () => {
                      const targetElement = document.getElementById(targetId)
                      if (targetElement) {
                        // Учитываем высоту navbar при скролле
                        const navbarHeight = 90 // var(--navbar-height)
                        const elementPosition = targetElement.getBoundingClientRect().top + window.pageYOffset
                        const offsetPosition = elementPosition - navbarHeight
                        
                        window.scrollTo({
                          top: offsetPosition,
                          behavior: 'smooth'
                        })
                        return true
                      }
                      return false
                    }
                    
                    // Если мы не на главной странице, переходим на главную
                    if (location.pathname !== '/') {
                      navigate('/')
                      // Ждем перехода и затем скроллим - пробуем несколько раз
                      let attempts = 0
                      const maxAttempts = 10
                      const tryScroll = () => {
                        attempts++
                        if (scrollToElement() || attempts >= maxAttempts) {
                          return
                        }
                        setTimeout(tryScroll, 100)
                      }
                      setTimeout(tryScroll, 300)
                    } else {
                      // Если уже на главной, скроллим к секции с небольшой задержкой
                      setTimeout(() => {
                        scrollToElement()
                      }, 50)
                    }
                  }
                }
                
                return (
                  <div key={index} className="inline-flex items-center">
                    {isAnchorLink ? (
                      <a
                        href={item.path}
                        className={`nav-link transition-all duration-300 text-[14px] uppercase relative ${
                          isActive 
                            ? 'text-second-text' 
                            : 'text-main-text hover:text-second-text'
                        }`}
                        style={{ fontWeight: 450 }}
                        onClick={handleClick}
                      >
                        <span className="nav-link-text">{item.label}</span>
                      </a>
                    ) : (
                      <Link
                        to={item.path}
                        className={`nav-link transition-all duration-300 text-[14px] uppercase relative ${
                          isActive 
                            ? 'text-second-text' 
                            : 'text-main-text hover:text-second-text'
                        }`}
                        style={{ fontWeight: 450 }}
                        onClick={handleClick}
                      >
                        <span className="nav-link-text">{item.label}</span>
                      </Link>
                    )}
                    {index < headerMenuItems.length - 1 && (
                      <span className="mx-2 text-main-text text-[14px]">/</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Burger Wrap - всегда видим */}
            <button
              className="burger-wrap w-[50px] h-[50px] flex items-center justify-end"
              onClick={() => isMenuOpen ? handleCloseMenu() : handleOpenMenu()}
              aria-label="Toggle menu"
            >
              <div className="flex flex-col gap-1.5 w-6 items-end">
                <span 
                  className={`block w-full h-0.5 bg-main-text rounded-full transition-all duration-300 ${
                    isMenuOpen ? 'rotate-45 translate-y-[4px]' : ''
                  }`}
                />
                <span 
                  className={`block h-0.5 bg-main-text rounded-full transition-all duration-300 ${
                    isMenuOpen ? 'w-full -rotate-45 -translate-y-[4px]' : 'w-2/3'
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )

  return (
    <>
      {/* Рендерим navbar через Portal, чтобы он был в body и имел приоритет */}
      {createPortal(navbarContent, document.body)}

      {/* Fullscreen Menu - рендерим через Portal на уровне body */}
      {(isMenuOpen || isClosing) && createPortal(
        <div className={`fullscreen-menu ${isClosing ? 'closing' : ''}`}>
          <div className="fullscreen-menu-content">
            {fullscreenMenuItems.map((item, index) => {
              const isAnchorLink = item.path.includes('#')
              
              const handleFullscreenClick = (e) => {
                handleCloseMenu()
                
                if (isAnchorLink) {
                  e.preventDefault()
                  const targetId = item.path.replace(/^\/?#/, '') // Получаем id секции (убираем /# или #)
                  
                  // Функция для скролла к элементу
                  const scrollToElement = () => {
                    const targetElement = document.getElementById(targetId)
                    if (targetElement) {
                      // Учитываем высоту navbar при скролле
                      const navbarHeight = 90 // var(--navbar-height)
                      const elementPosition = targetElement.getBoundingClientRect().top + window.pageYOffset
                      const offsetPosition = elementPosition - navbarHeight
                      
                      window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                      })
                      return true
                    }
                    return false
                  }
                  
                  // Если мы не на главной странице, переходим на главную
                  if (location.pathname !== '/') {
                    navigate('/')
                    // Ждем перехода и затем скроллим - пробуем несколько раз
                    let attempts = 0
                    const maxAttempts = 10
                    const tryScroll = () => {
                      attempts++
                      if (scrollToElement() || attempts >= maxAttempts) {
                        return
                      }
                      setTimeout(tryScroll, 100)
                    }
                    setTimeout(tryScroll, 300)
                  } else {
                    // Если уже на главной, скроллим к секции с небольшой задержкой
                    setTimeout(() => {
                      scrollToElement()
                    }, 50)
                  }
                }
              }
              
              return isAnchorLink ? (
                <a
                  key={index}
                  href={item.path}
                  className="fullscreen-menu-link"
                  onClick={handleFullscreenClick}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={index}
                  to={item.path}
                  className="fullscreen-menu-link"
                  onClick={handleFullscreenClick}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export default Navbar

