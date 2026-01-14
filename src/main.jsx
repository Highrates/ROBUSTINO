import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/global.css'
import ErrorBoundary from './components/common/ErrorBoundary'
import useAuthStore from './store/authStore'

// Инициализация аутентификации (безопасно, не блокирует рендер)
try {
  useAuthStore.getState().init().catch((error) => {
    console.warn('Auth initialization error:', error)
  })
} catch (error) {
  console.warn('Auth store initialization failed:', error)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

