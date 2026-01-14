import { create } from 'zustand'
import { getFAQs, getFAQ, createFAQ, updateFAQ, deleteFAQ, updateFAQOrder } from '@utils/api'

/**
 * FAQ store using Zustand
 */
const useFAQStore = create((set, get) => ({
  faqs: [],
  currentFAQ: null,
  loading: false,
  error: null,
  lastFetched: null,
  cacheTTL: 30000, // 30 секунд кэш
  fetchAbortFlag: null, // Флаг для отмены запросов

  // Fetch all FAQs
  fetchFAQs: async (force = false) => {
    const state = get()
    
    // Проверяем кэш, если не принудительная загрузка
    // Если данных нет (первый запуск), всегда загружаем
    if (!force && state.lastFetched && state.faqs.length > 0) {
      const cacheAge = Date.now() - state.lastFetched
      if (cacheAge < state.cacheTTL) {
        // Данные свежие, не загружаем
        return
      }
    }

    // Отменяем предыдущий запрос, если он еще выполняется
    if (state.fetchAbortFlag) {
      state.fetchAbortFlag.cancelled = true
    }

    // Создаем новый флаг отмены
    const abortFlag = { cancelled: false }
    set({ loading: true, error: null, fetchAbortFlag: abortFlag })

    try {
      const faqs = await getFAQs()
      
      // Проверяем, не был ли запрос отменен
      if (abortFlag.cancelled) {
        return
      }

      set({ faqs, loading: false, lastFetched: Date.now(), fetchAbortFlag: null })
    } catch (error) {
      // Игнорируем ошибки отмененных запросов
      if (abortFlag.cancelled) {
        return
      }
      set({ error: error.message, loading: false, fetchAbortFlag: null })
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
        lastFetched: Date.now(), // Обновляем кэш
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
        lastFetched: Date.now(), // Обновляем кэш
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
        lastFetched: Date.now(), // Обновляем кэш
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

