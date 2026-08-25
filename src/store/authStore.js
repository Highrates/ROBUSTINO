import { create } from 'zustand'
import {
  apiFetch,
  setSessionActive,
  clearClientSession,
  setUnauthorizedHandler,
  hasSession,
} from '@/utils/http'

const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  checkSession: async () => {
    try {
      set({ isLoading: true, error: null })
      // skipAuthHandler: 401 on /me just means "not logged in"
      const data = await apiFetch('/auth/me', { skipAuthHandler: true })
      setSessionActive(true)
      set({
        user: data.user,
        session: { user: data.user },
        isAuthenticated: true,
        isLoading: false,
      })
    } catch {
      clearClientSession()
      set({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      })
    }
  },

  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null })
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: { email, password },
        skipAuthHandler: true,
      })
      setSessionActive(true)
      set({
        user: data.user,
        session: data.session,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
      return { success: true }
    } catch (error) {
      clearClientSession()
      set({ isLoading: false, error: error.message })
      return { success: false, error: error.message }
    }
  },

  logout: async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST', skipAuthHandler: true })
    } catch {
      /* ignore */
    }
    clearClientSession()
    set({
      user: null,
      session: null,
      isAuthenticated: false,
      error: null,
    })
  },

  init: async () => {
    setUnauthorizedHandler(() => {
      const { isAuthenticated } = get()
      if (!isAuthenticated) return
      clearClientSession()
      set({
        user: null,
        session: null,
        isAuthenticated: false,
        error: 'Сессия истекла',
      })
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
        if (!window.location.pathname.includes('/admin/login')) {
          window.location.assign('/admin/login')
        }
      }
    })
    try {
      await get().checkSession()
    } catch (error) {
      console.error('Error initializing auth:', error)
      set({ isLoading: false })
    }
  },
}))

export { hasSession }
export default useAuthStore
