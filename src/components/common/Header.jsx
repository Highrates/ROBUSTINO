import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()

  const handleContactsClick = (e) => {
    if (location.pathname === '/') {
      // Если мы уже на главной странице, скроллим к секции
      e.preventDefault()
      const contactsSection = document.getElementById('contacts')
      if (contactsSection) {
        contactsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
    // Закрываем мобильное меню в любом случае
    setIsMenuOpen(false)
  }

  return (
    <header className="bg-main-bg sticky top-0 z-50">
      <nav className="padding-global">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold text-main-text">
            ROBUSTINO
          </Link>

          {/* Desktop Menu */}
          <ul className="hidden md:flex items-center gap-8">
            <li><Link to="/" className="text-main-text hover:text-second-text transition-colors">Главная</Link></li>
            <li><Link to="/about" className="text-main-text hover:text-second-text transition-colors">О компании</Link></li>
            <li><Link to="/articles" className="text-main-text hover:text-second-text transition-colors">Блог</Link></li>
            <li><Link to="/#contacts" onClick={handleContactsClick} className="text-main-text hover:text-second-text transition-colors">Контакты</Link></li>
          </ul>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-main-text"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <ul className="md:hidden pb-4 space-y-3">
            <li><Link to="/" onClick={() => setIsMenuOpen(false)} className="text-main-text">Главная</Link></li>
            <li><Link to="/about" onClick={() => setIsMenuOpen(false)} className="text-main-text">О компании</Link></li>
            <li><Link to="/articles" onClick={() => setIsMenuOpen(false)} className="text-main-text">Блог</Link></li>
            <li><Link to="/#contacts" onClick={handleContactsClick} className="text-main-text">Контакты</Link></li>
          </ul>
        )}
      </nav>
    </header>
  )
}

export default Header

