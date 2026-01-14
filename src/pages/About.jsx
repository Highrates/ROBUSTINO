import { useEffect } from 'react'

const About = () => {
  // Скроллим вверх при монтировании страницы
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    // Дополнительно на случай, если первый вызов не сработал
    const timeoutId = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [])

  return (
    <div className="about-page container-custom section-padding">
      <h1 className="text-4xl font-heading mb-8">О компании</h1>
      {/* About content will be added here */}
    </div>
  )
}

export default About

