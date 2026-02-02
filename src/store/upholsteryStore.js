import { create } from 'zustand'
import { 
  getUpholsteryVariants, 
  getUpholsteryVariant, 
  createUpholsteryVariant, 
  updateUpholsteryVariant, 
  deleteUpholsteryVariant,
} from '@utils/api'

// TTL для кэша в памяти (5 минут)
const CACHE_TTL = 5 * 60 * 1000

/**
 * Upholstery Variants store using Zustand
 */
const useUpholsteryStore = create((set, get) => ({
  variants: [],
  currentVariant: null,
  loading: false,
  error: null,
  lastFetched: null,
  fetchAbortFlag: null,

  // Fetch all variants с умным кэшированием и stale-while-revalidate
  fetchVariants: async (force = false) => {
    const state = get()
    
    // Отменяем предыдущий запрос если есть
    if (state.fetchAbortFlag) {
      state.fetchAbortFlag.cancelled = true
    }
    
    // Проверяем свежесть кэша
    const hasData = state.variants.length > 0
    const cacheAge = state.lastFetched ? Date.now() - state.lastFetched : Infinity
    const isCacheFresh = cacheAge < CACHE_TTL
    
    // Если кэш свежий и не форсируем обновление - возвращаем из кэша
    if (!force && hasData && isCacheFresh) {
      console.log(`[Upholstery] Using cache (age: ${Math.round(cacheAge / 1000)}s)`)
      return
    }
    
    // Stale-while-revalidate: показываем старые данные сразу, обновляем в фоне
    const showLoader = !hasData // Loader только если нет данных вообще
    
    const abortFlag = { cancelled: false }
    set({ loading: showLoader, error: null, fetchAbortFlag: abortFlag })

    try {
      const variants = await getUpholsteryVariants()
      
      if (abortFlag.cancelled) {
        return
      }

      set({ variants, loading: false, lastFetched: Date.now(), fetchAbortFlag: null })
      console.log('[Upholstery] Data refreshed from server')
    } catch (error) {
      if (abortFlag.cancelled) {
        return
      }
      
      // Если есть старые данные - оставляем их, только логируем ошибку
      if (hasData) {
        console.warn('[Upholstery] Failed to refresh, using stale data:', error.message)
        set({ loading: false, fetchAbortFlag: null })
      } else {
        console.error('Ошибка загрузки вариантов обивок:', error)
        set({ error: error.message, loading: false, fetchAbortFlag: null })
      }
    }
  },

  // Fetch single variant
  fetchVariant: async (id) => {
    set({ loading: true, error: null })
    try {
      const variant = await getUpholsteryVariant(id)
      set({ currentVariant: variant, loading: false })
      return variant
    } catch (error) {
      console.error('Ошибка загрузки варианта обивки:', error)
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Add variant
  addVariant: async (variantData) => {
    try {
      const newVariant = await createUpholsteryVariant(variantData)
      set((state) => ({
        variants: [newVariant, ...state.variants],
        lastFetched: Date.now() // Обновляем timestamp кэша
      }))
      return newVariant
    } catch (error) {
      console.error('Ошибка создания варианта обивки:', error)
      set({ error: error.message })
      throw error
    }
  },

  // Update variant
  updateVariant: async (id, updates) => {
    try {
      const updatedVariant = await updateUpholsteryVariant(id, updates)
      set((state) => ({
        variants: state.variants.map((v) => (v.id === id ? updatedVariant : v)),
        currentVariant: state.currentVariant?.id === id ? updatedVariant : state.currentVariant,
        lastFetched: null // Инвалидируем кэш - следующий fetch обновит данные
      }))
      return updatedVariant
    } catch (error) {
      console.error('Ошибка обновления варианта обивки:', error)
      set({ error: error.message })
      throw error
    }
  },

  // Remove variant
  removeVariant: async (id) => {
    try {
      await deleteUpholsteryVariant(id)
      set((state) => ({
        variants: state.variants.filter((v) => v.id !== id),
        currentVariant: state.currentVariant?.id === id ? null : state.currentVariant,
        lastFetched: Date.now() // Обновляем timestamp кэша
      }))
    } catch (error) {
      console.error('Ошибка удаления варианта обивки:', error)
      set({ error: error.message })
      throw error
    }
  },

  // Optimistic update для удаления
  setVariantsOptimistic: (variantId) => {
    set((state) => ({
      variants: state.variants.filter((v) => v.id !== variantId)
    }))
  },

  // Rollback при ошибке удаления
  rollbackVariants: (variants) => {
    set({ variants })
  },

  // Clear current variant
  clearCurrentVariant: () => {
    set({ currentVariant: null })
  },
}))

export default useUpholsteryStore

