import { create } from 'zustand'
import { getFAQs, getFAQ, createFAQ, updateFAQ, deleteFAQ, updateFAQOrder } from '@utils/api'

// TTL для кэша в памяти (5 минут)
const CACHE_TTL = 5 * 60 * 1000

/**
 * FAQ store using Zustand
 */
const useFAQStore = create((set, get) => ({
  faqs: [],
  currentFAQ: null,
  loading: false,
  error: null,
  lastFetched: null,
  fetchAbortFlag: null,

  // Fetch all FAQs с умным кэшированием и stale-while-revalidate
  fetchFAQs: async (force = false) => {
    const state = get()
    
    // Отменяем предыдущий запрос если есть
    if (state.fetchAbortFlag) {
      state.fetchAbortFlag.cancelled = true
    }
    
    // Проверяем свежесть кэша
    const hasData = state.faqs.length > 0
    const cacheAge = state.lastFetched ? Date.now() - state.lastFetched : Infinity
    const isCacheFresh = cacheAge < CACHE_TTL
    
    // Если кэш свежий и не форсируем обновление - возвращаем из кэша
    if (!force && hasData && isCacheFresh) {
      console.log(`[FAQ] Using cache (age: ${Math.round(cacheAge / 1000)}s)`)
      return
    }
    
    // Stale-while-revalidate: показываем старые данные сразу, обновляем в фоне
    const showLoader = !hasData // Loader только если нет данных вообще
    
    const abortFlag = { cancelled: false }
    set({ loading: showLoader, error: null, fetchAbortFlag: abortFlag })

    try {
      const faqs = await getFAQs()
      
      // Проверяем, не был ли запрос отменен
      if (abortFlag.cancelled) {
        return
      }

      set({ faqs, loading: false, lastFetched: Date.now(), fetchAbortFlag: null })
      console.log('[FAQ] Data refreshed from server')
    } catch (error) {
      // Игнорируем ошибки отмененных запросов
      if (abortFlag.cancelled) {
        return
      }
      
      // Если есть старые данные - оставляем их, только логируем ошибку
      if (hasData) {
        console.warn('[FAQ] Failed to refresh, using stale data:', error.message)
        set({ loading: false, fetchAbortFlag: null })
      } else {
        set({ error: error.message, loading: false, fetchAbortFlag: null })
      }
    }
  },

  // Fetch single FAQ
  fetchFAQ: async (id) => {
    const state = get()
    
    // Отменяем предыдущий запрос, если он еще выполняется
    if (state.fetchAbortFlag) {
      state.fetchAbortFlag.cancelled = true
    }

    // Создаем новый флаг отмены
    const abortFlag = { cancelled: false }
    set({ loading: true, error: null, fetchAbortFlag: abortFlag })

    try {
      const faq = await getFAQ(id)
      
      // Проверяем, не был ли запрос отменен
      if (abortFlag.cancelled) {
        return
      }

      set({ currentFAQ: faq, loading: false, fetchAbortFlag: null })
    } catch (error) {
      // Игнорируем ошибки отмененных запросов
      if (abortFlag.cancelled) {
        return
      }
      set({ error: error.message, loading: false, fetchAbortFlag: null })
    }
  },

  // Add new FAQ
  addFAQ: async (faqData) => {
    set({ loading: true, error: null })
    try {
      const newFAQ = await createFAQ(faqData)
      set((state) => ({
        faqs: [...state.faqs, newFAQ],
        loading: false,
        lastFetched: Date.now(), // Обновляем timestamp кэша
      }))
      return newFAQ
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Update FAQ
  editFAQ: async (id, updates) => {
    set({ loading: true, error: null })
    try {
      const updatedFAQ = await updateFAQ(id, updates)
      set((state) => ({
        faqs: state.faqs.map((f) => (f.id === id ? updatedFAQ : f)),
        loading: false,
        lastFetched: null, // Инвалидируем кэш - следующий fetch обновит данные
      }))
      return updatedFAQ
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Remove FAQ
  removeFAQ: async (id) => {
    set({ loading: true, error: null })
    try {
      await deleteFAQ(id)
      set((state) => ({
        faqs: state.faqs.filter((f) => f.id !== id),
        loading: false,
        lastFetched: Date.now(), // Обновляем timestamp кэша
      }))
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Clear current FAQ
  clearCurrentFAQ: () => set({ currentFAQ: null }),

  // Optimistic update methods for better encapsulation
  setFAQsOptimistic: (optimisticFAQs) => {
    set({ faqs: optimisticFAQs })
  },

  rollbackFAQs: (previousFAQs) => {
    set({ faqs: previousFAQs })
  },

  // Update FAQs order
  updateFAQsOrder: async (orderedFAQs) => {
    set({ loading: true, error: null })
    try {
      // Создаем массив обновлений для API
      const orderUpdates = orderedFAQs.map((faq, index) => ({
        id: faq.id,
        display_order: index
      }))
      
      await updateFAQOrder(orderUpdates)
      
      // Обновляем store с новым порядком
      set((state) => ({
        faqs: orderedFAQs,
        loading: false,
        lastFetched: Date.now(), // Обновляем кэш
      }))
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },
}))

export default useFAQStore

