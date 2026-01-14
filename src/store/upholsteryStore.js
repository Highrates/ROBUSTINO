import { create } from 'zustand'
import { 
  getUpholsteryVariants, 
  getUpholsteryVariant, 
  createUpholsteryVariant, 
  updateUpholsteryVariant, 
  deleteUpholsteryVariant 
} from '@utils/api'

/**
 * Upholstery Variants store using Zustand
 */
const useUpholsteryStore = create((set, get) => ({
  variants: [],
  currentVariant: null,
  loading: false,
  error: null,
  lastFetched: null,
  cacheTTL: 30000, // 30 секунд кэш
  fetchAbortFlag: null, // Флаг для отмены запросов

  // Fetch all variants
  fetchVariants: async (force = false) => {
    const state = get()
    
    // Проверяем кэш, если не принудительная загрузка
    if (!force && state.lastFetched && state.variants.length > 0) {
      const cacheAge = Date.now() - state.lastFetched
      if (cacheAge < state.cacheTTL) {
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
      const variants = await getUpholsteryVariants()
      
      if (abortFlag.cancelled) {
        return
      }

      set({ variants, loading: false, lastFetched: Date.now(), fetchAbortFlag: null })
    } catch (error) {
      if (abortFlag.cancelled) {
        return
      }
      console.error('Ошибка загрузки вариантов обивок:', error)
      set({ error: error.message, loading: false, fetchAbortFlag: null })
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
        lastFetched: null // Инвалидируем кэш
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
        lastFetched: null // Инвалидируем кэш
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
        lastFetched: null // Инвалидируем кэш
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

