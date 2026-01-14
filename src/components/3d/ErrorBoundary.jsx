import React from 'react'

/**
 * ErrorBoundary для обработки ошибок загрузки 3D моделей
 * Ловит ошибки в дочерних компонентах и показывает fallback UI
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    // Обновляет state для показа fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Логируем ошибку для отладки
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      // Показываем fallback UI
      return this.props.fallback || (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-red-500">
          Ошибка загрузки модели
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
