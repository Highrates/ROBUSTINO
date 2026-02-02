import { create } from 'zustand'
import { getPresentation, createPresentation, updatePresentation } from '@utils/api'

// TTL для кэша в памяти (5 минут)
const CACHE_TTL = 5 * 60 * 1000

/**
 * Presentation store using Zustand
 */
const usePresentationStore = create((set, get) => ({
  presentation: null,
  loading: false,
  error: null,
  lastFetched: null,
  fetchAbortFlag: null,

  fetchPresentation: async (force = false) => {
    const state = get()
    
    // Отменяем предыдущий запрос если есть
    if (state.fetchAbortFlag) {
      state.fetchAbortFlag.cancelled = true
    }
    
    // Проверяем свежесть кэша
    const hasData = state.presentation !== null
    const cacheAge = state.lastFetched ? Date.now() - state.lastFetched : Infinity
    const isCacheFresh = cacheAge < CACHE_TTL
    
    // Если кэш свежий и не форсируем обновление - возвращаем из кэша
    if (!force && hasData && isCacheFresh) {
      console.log(`[Presentation] Using cache (age: ${Math.round(cacheAge / 1000)}s)`)
      return
    }
    
    // Stale-while-revalidate: показываем старые данные сразу, обновляем в фоне
    const showLoader = !hasData // Loader только если нет данных вообще
    
    const abortFlag = { cancelled: false }
    set({ loading: showLoader, error: null, fetchAbortFlag: abortFlag })

    try {
      const presentation = await getPresentation()
      
      if (abortFlag.cancelled) {
        return
      }

      set({ presentation, loading: false, lastFetched: Date.now(), fetchAbortFlag: null })
      console.log('[Presentation] Data refreshed from server')
    } catch (error) {
      if (abortFlag.cancelled) {
        return
      }
      
      // Если есть старые данные - оставляем их, только логируем ошибку
      if (hasData) {
        console.warn('[Presentation] Failed to refresh, using stale data:', error.message)
        set({ loading: false, fetchAbortFlag: null })
      } else {
        set({ error: error.message, loading: false, fetchAbortFlag: null })
      }
    }
  },

  savePresentation: async (presentationData) => {
    set({ loading: true, error: null })
    try {
      const state = get()
      let savedPresentation
      
      if (state.presentation) {
        savedPresentation = await updatePresentation(presentationData)
      } else {
        savedPresentation = await createPresentation(presentationData)
      }
      set({ 
        presentation: savedPresentation, 
        loading: false, 
        lastFetched: Date.now() // Обновляем timestamp кэша
      })
      return savedPresentation
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },
}))

export default usePresentationStore
