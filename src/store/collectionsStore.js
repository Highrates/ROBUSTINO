import { create } from 'zustand'
import { 
  getUpholsteryCollections, 
  getUpholsteryCollection, 
  getOrCreateCollection,
  createUpholsteryCollection, 
  updateUpholsteryCollection, 
  deleteUpholsteryCollection,
} from '@utils/api'

// TTL для кэша в памяти (5 минут)
const CACHE_TTL = 5 * 60 * 1000

/**
 * Upholstery Collections store using Zustand
 */
const useCollectionsStore = create((set, get) => ({
  collections: [],
  currentCollection: null,
  loading: false,
  error: null,
  lastFetched: null,
  fetchAbortFlag: null,

  // Fetch all collections с умным кэшированием и stale-while-revalidate
  fetchCollections: async (force = false) => {
    const state = get()
    
    // Отменяем предыдущий запрос если есть
    if (state.fetchAbortFlag) {
      state.fetchAbortFlag.cancelled = true
    }
    
    // Проверяем свежесть кэша
    const hasData = state.collections.length > 0
    const cacheAge = state.lastFetched ? Date.now() - state.lastFetched : Infinity
    const isCacheFresh = cacheAge < CACHE_TTL
    
    // Если кэш свежий и не форсируем обновление - возвращаем из кэша
    if (!force && hasData && isCacheFresh) {
      console.log(`[Collections] Using cache (age: ${Math.round(cacheAge / 1000)}s)`)
      return
    }
    
    // Stale-while-revalidate: показываем старые данные сразу, обновляем в фоне
    const showLoader = !hasData // Loader только если нет данных вообще
    
    const abortFlag = { cancelled: false }
    set({ loading: showLoader, error: null, fetchAbortFlag: abortFlag })

    try {
      const collections = await getUpholsteryCollections()
      
      if (abortFlag.cancelled) {
        return
      }

      set({ collections, loading: false, lastFetched: Date.now(), fetchAbortFlag: null })
      console.log('[Collections] Data refreshed from server')
    } catch (error) {
      if (abortFlag.cancelled) {
        return
      }
      
      // Если есть старые данные - оставляем их, только логируем ошибку
      if (hasData) {
        console.warn('[Collections] Failed to refresh, using stale data:', error.message)
        set({ loading: false, fetchAbortFlag: null })
      } else {
        console.error('Ошибка загрузки коллекций:', error)
        set({ error: error.message, loading: false, fetchAbortFlag: null })
      }
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
        await get().fetchCollections()
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
        lastFetched: Date.now() // Обновляем timestamp кэша
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
        lastFetched: null // Инвалидируем кэш - следующий fetch обновит данные
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
        lastFetched: Date.now() // Обновляем timestamp кэша
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
