import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Navbar from '@components/product/Navbar'
import ContactsSection from '@components/common/ContactsSection'
import Footer from '@components/common/Footer'
import useGSAP from '@hooks/useGSAP'
import { getNavbarHeight } from '@utils/layout'

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger)

const About = () => {
  const aboutSectionRef = useRef(null)
  const aboutTitlesRef = useRef(null)
  const aboutContentSectionRef = useRef(null)
  const secondTitleRef = useRef(null)
  const aboutContentRightRef = useRef(null)

  // Скроллим вверх при монтировании страницы
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    // Дополнительно на случай, если первый вызов не сработал
    const timeoutId = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [])

  // Добавляем класс к body для убирания фона у navbar на странице About
  useEffect(() => {
    document.body.classList.add('about-page-active')
    return () => {
      document.body.classList.remove('about-page-active')
    }
  }, [])

  // Отслеживаем скролл и меняем стили navbar
  useEffect(() => {
    const handleScroll = () => {
      const navbar = document.querySelector('.navbar')
      if (!navbar || !aboutSectionRef.current) return

      const aboutSection = aboutSectionRef.current
      const sectionBottom = aboutSection.offsetTop + aboutSection.offsetHeight
      const scrollY = window.scrollY
      const navbarHeight = getNavbarHeight()

      // Если navbar находится в пределах секции About-page-section
      if (scrollY + navbarHeight < sectionBottom) {
        navbar.classList.add('navbar-in-hero-section')
      } else {
        navbar.classList.remove('navbar-in-hero-section')
      }
    }

    // Проверяем при монтировании
    handleScroll()

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Анимации появления элементов
  useGSAP(() => {
    // Анимация для About-page-section (hero секция)
    if (aboutTitlesRef.current) {
      gsap.set(aboutTitlesRef.current, { opacity: 0, y: 60 })
      gsap.to(aboutTitlesRef.current, {
        opacity: 1,
        y: 0,
        duration: 1,
        delay: 0.2,
        ease: 'power3.out'
      })
    }

    // Анимация для about-page-content-section
    if (secondTitleRef.current && aboutContentSectionRef.current) {
      gsap.set(secondTitleRef.current, { opacity: 0, y: 60 })
      gsap.to(secondTitleRef.current, {
        opacity: 1,
        y: 0,
        duration: 1,
        scrollTrigger: {
          trigger: aboutContentSectionRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none'
        },
        ease: 'power3.out'
      })
    }

    if (aboutContentRightRef.current && aboutContentSectionRef.current) {
      gsap.set(aboutContentRightRef.current, { opacity: 0, y: 60 })
      gsap.to(aboutContentRightRef.current, {
        opacity: 1,
        y: 0,
        duration: 1,
        delay: 0.2,
        scrollTrigger: {
          trigger: aboutContentSectionRef.current,
          start: 'top 80%',
          toggleActions: 'play none none none'
        },
        ease: 'power3.out'
      })
    }
  })

  return (
    <div className="about-page">
      <Navbar />
      <section ref={aboutSectionRef} className="About-page-section">
        <div className="padding-global">
          <div className="container-large">
            <div ref={aboutTitlesRef} className="about-titles">
              <h1 className="about-hero-title">ROBUSTINO</h1>
              <p className="about-hero-subtitle">надежные и стильные кресла</p>
            </div>
          </div>
        </div>
      </section>
      
      <section ref={aboutContentSectionRef} className="about-page-content-section">
        <div className="padding-global">
          <div className="container-large">
            <div className="about-page-content">
              <div className="about-page-content-header">
                <h2 ref={secondTitleRef} className="second-title">История</h2>
              </div>
              <div ref={aboutContentRightRef} className="about-page-content-right">
                <div className="about-page-story">
                  <div className="about-page-story-item">
                    <div className="about-page-story-label">
                      <p className="about-page-story-date">
                        с 2007 года
                      </p>
                    </div>
                    <div className="about-page-story-body">
                      <p className="about-page-story-text">
                        Мы производим и торгуем мебелью. Проектируем офисные и общественные помещения, в том числе актовые, театральные, конференц, кинозалы, аэровокзалы, медицинские учреждения.
                      </p>
                    </div>
                  </div>
                  <div className="about-page-story-item">
                    <div className="about-page-story-label">
                      <p className="about-page-story-date">
                        На 2009 год
                      </p>
                    </div>
                    <div className="about-page-story-body">
                      <p className="about-page-story-text">
                        Дилер в России большинства отечественных и зарубежных фабрик по производству кресел для залов.
                      </p>
                    </div>
                  </div>
                  <div className="about-page-story-item">
                    <div className="about-page-story-label">
                      <p className="about-page-story-date">
                        С сентября 2011 года
                      </p>
                    </div>
                    <div className="about-page-story-body">
                      <p className="about-page-story-text">
                        Выпуск собственных кресел для залов и зон ожидания под маркой Ratco-Carandi из импортируемых из КНР комплектующих в Обнинске, Калужская обл. площадью 625 кв.м.
                      </p>
                    </div>
                  </div>
                  <div className="about-page-story-item">
                    <div className="about-page-story-label">
                      <p className="about-page-story-date">
                        К январю 2012 года
                      </p>
                    </div>
                    <div className="about-page-story-body">
                      <p className="about-page-story-text">
                        Мы увеличили производственные мощности и складские запасы комплектующих, чтобы производить и отгружать до 300 мест в неделю любого цвета и комплектации.
                      </p>
                    </div>
                  </div>
                  <div className="about-page-story-item">
                    <div className="about-page-story-label">
                      <p className="about-page-story-date">
                        В 2013 году
                      </p>
                    </div>
                    <div className="about-page-story-body">
                      <p className="about-page-story-text">
                        Приняли программу 100% импортозамещения и закупили оборудование для производства комплектующих:
                      </p>
                      <ul className="about-page-story-list">
                        <li>
                          пресс-формы для ТПА, (13 форм весом от 120 до 3000 кг);
                        </li>
                        <li>
                          заливочное оборудования для производства ФППУ (Заливочная машина высокого давления);
                        </li>
                        <li>
                          формы для ФППУ (24 формы по 4 комплекта на каждую модель для увеличения скорости производства);
                        </li>
                        <li>
                          и расширили производство цехом метизов и столярным цехом.
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="about-page-story-item">
                    <div className="about-page-story-label">
                      <p className="about-page-story-date">
                        В 2014 году
                      </p>
                    </div>
                    <div className="about-page-story-body">
                      <p className="about-page-story-text">
                        Получили первый опыт сотрудничества в рамках Таможенного Союза, оснастив конференц-зал в Национальном центре биотехнологий в г. Астана, Казахстан.
                      </p>
                    </div>
                  </div>
                  <div className="about-page-story-item">
                    <div className="about-page-story-label">
                      <p className="about-page-story-date">
                        С 2011 по 2015 год
                      </p>
                    </div>
                    <div className="about-page-story-body">
                      <p className="about-page-story-text">
                        Выпустили около 20 000 посадочных мест, или около 100 залов со средней вместимостью 200 человек.
                      </p>
                    </div>
                  </div>
                  <div className="about-page-story-item">
                    <div className="about-page-story-label">
                      <p className="about-page-story-date">
                        В апреле 2015 года
                      </p>
                    </div>
                    <div className="about-page-story-body">
                      <p className="about-page-story-text">
                        Пуск новой линии в России с передовой в нашем сегменте технологией Uniblock, имеющей аналоги только в Европе, со стартовой производственной мощностью 2000 шт/месяц.
                      </p>
                    </div>
                  </div>
                  <div className="about-page-story-item">
                    <div className="about-page-story-label">
                      <p className="about-page-story-date">
                        С 2016 года
                      </p>
                    </div>
                    <div className="about-page-story-body">
                      <p className="about-page-story-text">
                        Активно развиваем качество продукции, запускаем новые модели кресел:
                      </p>
                      <ul className="about-page-story-list">
                        <li>
                          запустили линию полного цикла производства кресел от сырья до готовой продукции по технологии Uniblock
                        </li>
                        <li>
                          закупили дополнительные 4 пресс-формы к ТПА для локального производства столиков в подлокотнике, оснащенных пружинным возвратным механизмом, а так же для производства декоративных заглушек мест крепления опор к полу и внешних декоративных накладок спинки и сидения из полипропилена (пластик)
                        </li>
                        <li>
                          разработали и запустили в серию стальной механизм складного столика на спинке кресла, комплектующие вырезаются на высокоточном лазерном станке, порошковая покраска в 2 слоя традиционно для стальных комплектующих.
                        </li>
                        <li>
                          разработали и запустили в серию механизм качания спинки
                        </li>
                        <li>
                          разработали и запустили в серию механизм позволяющий устанавливать спинку кресла в полулежачем положении в нескольких углах наклона
                        </li>
                        <li>
                          разработали подголовник из ППУ с интегрированным стальным каркасом
                        </li>
                        <li>
                          увеличили столярный цех, закупили пресс для термо-вакуумного формования фанерных деталей «от сырья»
                        </li>
                        <li>
                          увеличили слесарный цех
                        </li>
                        <li>
                          закупили дополнительные 6 пресс-формы к ТПА для локального производства декоративных рамок столика внутри боковины, резиновых стопоров, специальных крепежных деталей, подлоконтиков и прорезиненных колес для нашего бестселлера складного кресла Archi Compact 2024.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <ContactsSection />
      <Footer />
    </div>
  )
}

export default About

