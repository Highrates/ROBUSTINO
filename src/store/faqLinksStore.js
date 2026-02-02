import { create } from 'zustand'
import { getFAQLinks, getFAQLink, createFAQLink, updateFAQLink, deleteFAQLink, updateFAQLinksOrder } from '@utils/api'

// TTL для кэша в памяти (5 минут)
const CACHE_TTL = 5 * 60 * 1000

/**
 * FAQ Links store using Zustand
 */
const useFAQLinksStore = create((set, get) => ({
  links: [],
  currentLink: null,
  loading: false,
  error: null,
  lastFetched: null,
  fetchAbortFlag: null,

  fetchFAQLinks: async (force = false) => {
    const state = get()
    
    // Отменяем предыдущий запрос если есть
    if (state.fetchAbortFlag) {
      state.fetchAbortFlag.cancelled = true
    }
    
    // Проверяем свежесть кэша
    const hasData = state.links.length > 0
    const cacheAge = state.lastFetched ? Date.now() - state.lastFetched : Infinity
    const isCacheFresh = cacheAge < CACHE_TTL
    
    // Если кэш свежий и не форсируем обновление - возвращаем из кэша
    if (!force && hasData && isCacheFresh) {
      console.log(`[FAQ Links] Using cache (age: ${Math.round(cacheAge / 1000)}s)`)
      return
    }
    
    // Stale-while-revalidate: показываем старые данные сразу, обновляем в фоне
    const showLoader = !hasData // Loader только если нет данных вообще
    
    const abortFlag = { cancelled: false }
    set({ loading: showLoader, error: null, fetchAbortFlag: abortFlag })

    try {
      const links = await getFAQLinks()
      
      if (abortFlag.cancelled) {
        return
      }

      set({ links, loading: false, lastFetched: Date.now(), fetchAbortFlag: null })
      console.log('[FAQ Links] Data refreshed from server')
    } catch (error) {
      if (abortFlag.cancelled) {
        return
      }
      
      // Если есть старые данные - оставляем их, только логируем ошибку
      if (hasData) {
        console.warn('[FAQ Links] Failed to refresh, using stale data:', error.message)
        set({ loading: false, fetchAbortFlag: null })
      } else {
        set({ error: error.message, loading: false, fetchAbortFlag: null })
      }
    }
  },

  fetchFAQLink: async (id) => {
    const state = get()
    
    if (state.fetchAbortFlag) {
      state.fetchAbortFlag.cancelled = true
    }

    const abortFlag = { cancelled: false }
    set({ loading: true, error: null, fetchAbortFlag: abortFlag })

    try {
      const link = await getFAQLink(id)
      
      if (abortFlag.cancelled) {
        return
      }

      set({ currentLink: link, loading: false, fetchAbortFlag: null })
    } catch (error) {
      if (abortFlag.cancelled) {
        return
      }
      set({ error: error.message, loading: false, fetchAbortFlag: null })
    }
  },

  addFAQLink: async (linkData) => {
    set({ loading: true, error: null })
    try {
      const newLink = await createFAQLink(linkData)
      set((state) => ({
        links: [...state.links, newLink],
        loading: false,
        lastFetched: Date.now(), // Обновляем timestamp кэша
      }))
      return newLink
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  editFAQLink: async (id, updates) => {
    set({ loading: true, error: null })
    try {
      const updatedLink = await updateFAQLink(id, updates)
      set((state) => ({
        links: state.links.map((l) => (l.id === id ? updatedLink : l)),
        loading: false,
        lastFetched: null, // Инвалидируем кэш - следующий fetch обновит данные
      }))
      return updatedLink
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  removeFAQLink: async (id) => {
    set({ loading: true, error: null })
    try {
      await deleteFAQLink(id)
      set((state) => ({
        links: state.links.filter((l) => l.id !== id),
        loading: false,
        lastFetched: Date.now(), // Обновляем timestamp кэша
      }))
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  setLinksOptimistic: (links) => {
    set({ links })
  },

  rollbackLinks: (links) => {
    set({ links })
  },

  updateLinksOrder: async (orderUpdates) => {
    set({ loading: true, error: null })
    try {
      await updateFAQLinksOrder(orderUpdates)
      set((state) => ({
        links: orderUpdates,
        loading: false,
        lastFetched: Date.now(),
      }))
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },
}))

export default useFAQLinksStore
