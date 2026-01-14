import { create } from 'zustand'
import { 
  getUpholsteryCollections, 
  getUpholsteryCollection, 
  getOrCreateCollection,
  createUpholsteryCollection, 
  updateUpholsteryCollection, 
  deleteUpholsteryCollection 
} from '@utils/api'

/**
 * Upholstery Collections store using Zustand
 */
const useCollectionsStore = create((set, get) => ({
  collections: [],
  currentCollection: null,
  loading: false,
  error: null,
  lastFetched: null,
  cacheTTL: 30000, // 30 секунд кэш
  fetchAbortFlag: null, // Флаг для отмены запросов

  // Fetch all collections
  fetchCollections: async (force = false) => {
    const state = get()
    
    // Проверяем кэш, если не принудительная загрузка
    if (!force && state.lastFetched && state.collections.length > 0) {
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
      const collections = await getUpholsteryCollections()
      
      if (abortFlag.cancelled) {
        return
      }

      set({ collections, loading: false, lastFetched: Date.now(), fetchAbortFlag: null })
    } catch (error) {
      if (abortFlag.cancelled) {
        return
      }
      console.error('Ошибка загрузки коллекций:', error)
      set({ error: error.message, loading: false, fetchAbortFlag: null })
    }
  },

  // Fetch single collection
  fetchCollection: async (id) => {
    set({ loading: true, error: null })
    try {
      const collection = await getUpholsteryCollection(id)
      set({ currentCollection: collection, loading: false })
      return collection
    } catch (error) {
      console.error('Ошибка загрузки коллекции:', error)
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Get or create collection by name (for auto-creation)
  getOrCreateCollectionByName: async (name) => {
    try {
      const collection = await getOrCreateCollection(name)
      // Обновляем список коллекций, если была создана новая
      if (collection) {
        await get().fetchCollections(true)
      }
      return collection
    } catch (error) {
      console.error('Ошибка получения/создания коллекции:', error)
      set({ error: error.message })
      throw error
    }
  },

  // Add collection
  addCollection: async (collectionData) => {
    try {
      const newCollection = await createUpholsteryCollection(collectionData)
      set((state) => ({
        collections: [newCollection, ...state.collections],
        lastFetched: null // Инвалидируем кэш
      }))
      return newCollection
    } catch (error) {
      console.error('Ошибка создания коллекции:', error)
      set({ error: error.message })
      throw error
    }
  },

  // Update collection
  updateCollection: async (id, updates) => {
    try {
      const updatedCollection = await updateUpholsteryCollection(id, updates)
      set((state) => ({
        collections: state.collections.map((c) => (c.id === id ? updatedCollection : c)),
        currentCollection: state.currentCollection?.id === id ? updatedCollection : state.currentCollection,
        lastFetched: null // Инвалидируем кэш
      }))
      return updatedCollection
    } catch (error) {
      console.error('Ошибка обновления коллекции:', error)
      set({ error: error.message })
      throw error
    }
  },

  // Remove collection
  removeCollection: async (id) => {
    try {
      await deleteUpholsteryCollection(id)
      set((state) => ({
        collections: state.collections.filter((c) => c.id !== id),
        currentCollection: state.currentCollection?.id === id ? null : state.currentCollection,
        lastFetched: null // Инвалидируем кэш
      }))
    } catch (error) {
      console.error('Ошибка удаления коллекции:', error)
      set({ error: error.message })
      throw error
    }
  },

  // Optimistic update для удаления
  setCollectionsOptimistic: (collectionId) => {
    set((state) => ({
      collections: state.collections.filter((c) => c.id !== collectionId)
    }))
  },

  // Rollback при ошибке удаления
  rollbackCollections: (collections) => {
    set({ collections })
  },

  // Clear current collection
  clearCurrentCollection: () => {
    set({ currentCollection: null })
  },
}))

export default useCollectionsStore
