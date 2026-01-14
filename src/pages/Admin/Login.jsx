import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@store/authStore'

const Login = () => {
  const navigate = useNavigate()
  const { login, isAuthenticated, isLoading, error } = useAuthStore()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Редирект если уже авторизован
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    setIsSubmitting(true)

    // Валидация
    if (!email || !password) {
      setLocalError('Пожалуйста, заполните все поля')
      setIsSubmitting(false)
      return
    }

    const result = await login(email, password)
    
    if (result.success) {
      navigate('/admin', { replace: true })
    } else {
      setLocalError(result.error || 'Ошибка входа. Проверьте email и пароль.')
    }
    
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Админ панель
          </h1>
          <p className="text-gray-600">Войдите в систему</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="admin@robustino.ru"
              disabled={isSubmitting || isLoading}
              required
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Пароль
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="••••••••"
              disabled={isSubmitting || isLoading}
              required
            />
          </div>

          {/* Error Message */}
          {(localError || error) && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {localError || error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isSubmitting || isLoading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>ROBUSTINO Admin Panel</p>
        </div>
      </div>
    </div>
  )
}

export default Login

