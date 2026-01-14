import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import useAuthStore from '@store/authStore'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, checkSession } = useAuthStore()

  useEffect(() => {
    // Проверяем сессию при монтировании (безопасно)
    try {
      checkSession().catch((error) => {
        console.warn('ProtectedRoute: checkSession error', error)
      })
    } catch (error) {
      console.warn('ProtectedRoute: checkSession failed', error)
    }
  }, [checkSession])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }

  return children
}

export default ProtectedRoute

