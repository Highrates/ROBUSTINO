import { create } from 'zustand'
import { supabase } from '@/config/supabase'

const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  // Проверка текущей сессии
  checkSession: async () => {
    try {
      // Проверяем, что Supabase настроен
      if (!supabase || !supabase.auth) {
        console.warn('Supabase not configured')
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        })
        return
      }

      set({ isLoading: true, error: null })
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) throw error

      if (session) {
        set({
          user: session.user,
          session,
          isAuthenticated: true,
          isLoading: false,
        })
      } else {
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
        })
      }
    } catch (error) {
      console.error('Error checking session:', error)
      set({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        error: error.message,
      })
    }
  },

  // Вход
  login: async (email, password) => {
    try {
      // Проверяем, что Supabase настроен
      if (!supabase || !supabase.auth) {
        return { 
          success: false, 
          error: 'Supabase не настроен. Проверьте .env файл.' 
        }
      }

      set({ isLoading: true, error: null })
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Более понятные сообщения об ошибках
        let errorMessage = error.message
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Неверный email или пароль'
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Email не подтвержден. Проверьте почту.'
        } else if (error.message.includes('User not found')) {
          errorMessage = 'Пользователь не найден. Создайте пользователя в Supabase Dashboard.'
        }
        throw new Error(errorMessage)
      }

      set({
        user: data.user,
        session: data.session,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })

      return { success: true }
    } catch (error) {
      console.error('Login error:', error)
      set({
        isLoading: false,
        error: error.message,
      })
      return { success: false, error: error.message }
    }
  },

  // Выход
  logout: async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      set({
        user: null,
        session: null,
        isAuthenticated: false,
        error: null,
      })
    } catch (error) {
      console.error('Logout error:', error)
      set({ error: error.message })
    }
  },

  // Инициализация (проверка сессии при загрузке)
  init: async () => {
    try {
      // Проверяем, что Supabase настроен
      if (!supabase || !supabase.auth) {
        console.warn('Supabase not configured, skipping auth initialization')
        set({ isLoading: false })
        return
      }

      await get().checkSession()

      // Слушаем изменения аутентификации
      supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          set({
            user: session.user,
            session,
            isAuthenticated: true,
          })
        } else {
          set({
            user: null,
            session: null,
            isAuthenticated: false,
          })
        }
      })
    } catch (error) {
      console.error('Error initializing auth:', error)
      set({ isLoading: false })
    }
  },
}))

export default useAuthStore

