import { useEffect, useRef, useMemo, useState } from 'react'
import Navbar from '@components/product/Navbar'
import Footer from '@components/common/Footer'
import useUpholsteryStore from '@store/upholsteryStore'
import { getUpholsteryColors } from '@utils/api'
import Loader from '@components/common/Loader'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger)

// Базовый маппинг популярных цветов (для быстрого доступа)
const knownColorMap = {
  'Белый': '#FFFFFF',
  'Черный': '#000000',
  'Серый': '#808080',
  'Бежевый': '#F5F5DC',
  'Коричневый': '#A52A2A',
  'Красный': '#FF0000',
  'Синий': '#0000FF',
  'Зеленый': '#008000',
  'Желтый': '#FFFF00',
  'Оранжевый': '#FFA500',
  'Фиолетовый': '#800080',
  'Розовый': '#FFC0CB',
  'Голубой': '#87CEEB',
  'Темно-синий': '#00008B',
  'Темно-коричневый': '#654321',
  'Светло-серый': '#D3D3D3',
  'Темно-серый': '#A9A9A9',
  'Кремовый': '#FFFDD0',
}

// Функция для генерации цвета из строки (hash-based)
const stringToColor = (str) => {
  if (!str) return '#CCCCCC'
  
  // Проверяем известные цвета
  if (knownColorMap[str]) {
    return knownColorMap[str]
  }
  
  // Генерируем цвет из hash строки
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // Генерируем насыщенный цвет (не слишком светлый и не слишком темный)
  const hue = Math.abs(hash) % 360
  const saturation = 60 + (Math.abs(hash) % 20) // 60-80%
  const lightness = 45 + (Math.abs(hash) % 15) // 45-60%
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

const Upholstery = () => {
  const { variants, loading, error, fetchVariants } = useUpholsteryStore()
  const [colors, setColors] = useState([])
  const [selectedColors, setSelectedColors] = useState([]) // Массив выбранных цветов
  const [colorsLoading, setColorsLoading] = useState(false)
  const allUpholsterySectionRef = useRef(null)
  const allUpholsteryTitleWrapperRef = useRef(null)
  const upholsteryGridRef = useRef(null)

  // Скроллим вверх при монтировании страницы
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    // Дополнительно на случай, если первый вызов не сработал
    const timeoutId = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [])

  // Загружаем варианты обивки при монтировании
  useEffect(() => {
    fetchVariants()
  }, [fetchVariants])

  // Загружаем список цветов при монтировании
  useEffect(() => {
    const loadColors = async () => {
      setColorsLoading(true)
      try {
        const colorsList = await getUpholsteryColors()
        setColors(colorsList)
      } catch (error) {
        console.error('Ошибка загрузки цветов:', error)
      } finally {
        setColorsLoading(false)
      }
    }
    loadColors()
  }, [])

  // Фильтруем и сортируем варианты по выбранным цветам
  const filteredVariants = useMemo(() => {
    if (selectedColors.length === 0) {
      return variants
    }
    
    // Разделяем на выбранные и невыбранные
    const selected = []
    const unselected = []
    
    variants.forEach(variant => {
      if (variant.color && selectedColors.includes(variant.color)) {
        selected.push(variant)
      } else {
        unselected.push(variant)
      }
    })
    
    // Возвращаем выбранные первыми, затем остальные
    return [...selected, ...unselected]
  }, [variants, selectedColors])

  // Подсчитываем количество видимых вариантов
  const visibleVariantsCount = useMemo(() => {
    if (selectedColors.length === 0) {
      return variants.length
    }
    return variants.filter(v => v.color && selectedColors.includes(v.color)).length
  }, [variants, selectedColors])

  // Проверяем настройки пользователя для уменьшенного движения
  const prefersReducedMotion = useMemo(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  // Анимация появления заголовка и карточек
  useEffect(() => {
    if (allUpholsterySectionRef.current) {
      const titleWrapper = allUpholsteryTitleWrapperRef.current

      // Если пользователь предпочитает уменьшенное движение, пропускаем анимации
      if (prefersReducedMotion) {
        if (titleWrapper) {
          gsap.set(titleWrapper, { opacity: 1, y: 0 })
        }
        if (filteredVariants.length > 0) {
          const upholsteryCards = upholsteryGridRef.current?.querySelectorAll('.upholstery-card')
          if (upholsteryCards && upholsteryCards.length > 0) {
            gsap.set(upholsteryCards, { opacity: 1, x: 0, scale: 1 })
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

      if (filteredVariants.length > 0) {
        // Небольшая задержка, чтобы убедиться, что DOM обновлен
        const timeoutId = setTimeout(() => {
          const upholsteryCards = upholsteryGridRef.current?.querySelectorAll('.upholstery-card')

          // Устанавливаем начальное состояние карточек
          if (upholsteryCards && upholsteryCards.length > 0) {
            gsap.set(upholsteryCards, {
              opacity: 0,
              x: 40,
              scale: 0.95
            })
          }

          // Обновляем ScrollTrigger
          ScrollTrigger.refresh()

          // Проверяем, видна ли секция сразу (для немедленного запуска анимации)
          const sectionRect = allUpholsterySectionRef.current?.getBoundingClientRect()
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
                trigger: allUpholsterySectionRef.current,
                start: 'top 80%',
                toggleActions: 'play none none none'
              },
              onComplete: () => {
                // Убираем will-change после анимации
                gsap.set(titleWrapper, { willChange: 'auto' })
              }
            })
          }

          // Анимация карточек вариантов обивки
          if (upholsteryCards && upholsteryCards.length > 0) {
            // Добавляем will-change для оптимизации
            gsap.set(upholsteryCards, { willChange: 'opacity, transform' })

            gsap.to(upholsteryCards, {
              opacity: 1,
              x: 0,
              scale: 1,
              duration: 0.8,
              stagger: 0.15,
              ease: 'power2.out',
              scrollTrigger: isSectionVisible ? undefined : {
                trigger: allUpholsterySectionRef.current,
                start: 'top 80%',
                toggleActions: 'play none none none'
              },
              onComplete: () => {
                // Убираем will-change после анимации
                gsap.set(upholsteryCards, { willChange: 'auto' })
            }
          })
          }
        }, 150) // Небольшая задержка для обновления DOM

        return () => {
          clearTimeout(timeoutId)
          // Очистка ScrollTrigger
          ScrollTrigger.getAll().forEach(trigger => {
            if (trigger.vars?.trigger === allUpholsterySectionRef.current) {
              trigger.kill()
            }
          })
          // Убираем will-change при размонтировании
          if (titleWrapper) {
            gsap.set(titleWrapper, { willChange: 'auto' })
          }
          const upholsteryCards = upholsteryGridRef.current?.querySelectorAll('.upholstery-card')
          if (upholsteryCards && upholsteryCards.length > 0) {
            gsap.set(upholsteryCards, { willChange: 'auto' })
          }
        }
      }
    }
  }, [loading, prefersReducedMotion]) // Убрали filteredVariants.length из зависимостей, чтобы анимации не перезапускались при фильтрации

  // Обработка изменений фильтрации (показываем/скрываем карточки без перезапуска анимаций)
  useEffect(() => {
    if (!upholsteryGridRef.current || loading) return

    const allCards = upholsteryGridRef.current.querySelectorAll('.upholstery-card')
    if (allCards.length === 0) return

    // Если нет выбранных цветов, показываем все карточки
    if (selectedColors.length === 0) {
      allCards.forEach((card) => {
        card.style.pointerEvents = 'auto'
        gsap.to(card, {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 0.3,
          ease: 'power2.out'
        })
      })
      return
    }

    // Получаем ID всех вариантов с выбранными цветами
    const selectedColorIds = new Set(
      variants
        .filter(v => v.color && selectedColors.includes(v.color))
        .map(v => v.id)
    )

    // Показываем/скрываем карточки в зависимости от фильтра
    allCards.forEach((card) => {
      const cardId = card.getAttribute('data-variant-id')
      if (!cardId) return

      if (selectedColorIds.has(cardId)) {
        // Показываем карточку
        card.style.pointerEvents = 'auto'
        gsap.to(card, {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 0.3,
          ease: 'power2.out'
        })
      } else {
        // Скрываем карточку
        card.style.pointerEvents = 'none'
        gsap.to(card, {
          opacity: 0,
          x: 20,
          scale: 0.95,
          duration: 0.3,
          ease: 'power2.out'
        })
      }
    })

    // Перемещаем выбранные карточки в начало через CSS order
    // Это будет обработано через стили в JSX
  }, [selectedColors, variants, loading])

  // Функция для получения цвета (с поддержкой кастомных цветов)
  const getColorHex = (colorName) => {
    return stringToColor(colorName)
  }

  // Обработчик клика по цвету (множественный выбор)
  const handleColorClick = (color) => {
    setSelectedColors(prev => {
      if (prev.includes(color)) {
        // Убираем цвет из выбранных
        return prev.filter(c => c !== color)
      } else {
        // Добавляем цвет к выбранным
        return [...prev, color]
      }
    })
  }

  return (
    <div className="upholstery-page relative bg-main-bg">
      <Navbar />
      
      <section ref={allUpholsterySectionRef} className="all-upholstery">
        <div className="padding-global">
          <div className="container-large">
            <div className="all-upholstery-content">
              <div className="all-upholstery-header inline-flex flex-col justify-start items-center" style={{ gap: '40px' }}>
                <div ref={allUpholsteryTitleWrapperRef} className="all-upholstery-title-wrapper">
                  <h1 className="hero-text" style={{ textTransform: 'uppercase' }}>Варианты обивки кресел</h1>
                  <span className="all-upholstery-count">{visibleVariantsCount}</span>
                </div>

                {/* Фильтр по цветам */}
                {colors.length > 0 && (
                  <div className="upholstery-color-filter inline-flex justify-center items-center flex-wrap" style={{ gap: '8px' }}>
                  {colors.map((color) => {
                    const isSelected = selectedColors.includes(color)
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleColorClick(color)}
                        className="upholstery-color-circle w-7 h-7 relative cursor-pointer transition-all"
                        aria-label={`Фильтр по цвету: ${color}`}
                        aria-pressed={isSelected}
                      >
                        {/* Border circle */}
                        <div className="w-7 h-7 left-0 top-0 absolute rounded-full border-[0.50px] border-black/25"></div>
                        {/* Color circle */}
                        <div
                          className="w-6 h-6 left-[2px] top-[2px] absolute rounded-full"
                          style={{
                            backgroundColor: getColorHex(color),
                            border: '1px solid rgba(0, 0, 0, 0.1)'
                          }}
                        ></div>
                        {/* Checkmark for selected state */}
                        {isSelected && (
                          <div className="w-7 h-7 left-0 top-0 absolute flex items-center justify-center pointer-events-none">
                            <span className="text-white" style={{ fontSize: '14px', lineHeight: '1', fontWeight: 'bold' }}>✔</span>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
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

              {!loading && !error && variants.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-second-text text-lg">Варианты обивки не найдены</p>
                </div>
              )}

              {!loading && !error && selectedColors.length > 0 && filteredVariants.filter(v => selectedColors.includes(v.color)).length === 0 && variants.length > 0 && (
                <div className="text-center py-20">
                  <p className="text-second-text text-lg">
                    Варианты обивки выбранных цветов не найдены
                  </p>
                  <button
                    onClick={() => setSelectedColors([])}
                    className="mt-4 text-blue-600 hover:text-blue-800 text-sm underline"
                  >
                    Сбросить фильтр
                  </button>
                </div>
              )}

              {!loading && !error && variants.length > 0 && (
                <div ref={upholsteryGridRef} className="upholstery-grid">
                  {filteredVariants.map((variant, index) => {
                    const collection = variant.upholstery_collections
                    const collectionName = collection?.name || 'Без коллекции'
                    const isSelected = variant.color && selectedColors.includes(variant.color)
                    
                    // Определяем порядок: выбранные идут первыми
                    const order = isSelected 
                      ? selectedColors.indexOf(variant.color) 
                      : selectedColors.length + index
                    
                    return (
                      <div
                        key={variant.id}
                        data-variant-id={variant.id}
                        className="upholstery-card flex flex-col gap-4"
                        style={{
                          order: order // Выбранные карточки будут в начале
                        }}
                      >
                        <p className="product-type">
                          <span style={{ color: '#000000' }}>[ </span>
                          {collectionName}
                          <span style={{ color: '#000000' }}> ]</span>
                        </p>
                        {variant.image_url ? (
                          <img
                            src={variant.image_url}
                            alt={variant.name}
                            className="upholstery-cover-image"
                            onError={(e) => {
                              e.target.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="upholstery-cover-image bg-second-bg flex items-center justify-center">
                            <span className="text-second-text text-sm">Нет изображения</span>
                          </div>
                        )}
                        <h3 className="upholstery-title">{variant.name}</h3>
                      </div>
                    )
                  })}
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

export default Upholstery
