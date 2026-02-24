import { create } from 'zustand'
import { getProducts, getProduct, getProductBySlug, createProduct, updateProduct, deleteProduct, updateProductOrder } from '@utils/api'

// TTL для кэша в памяти (5 минут)
const CACHE_TTL = 5 * 60 * 1000

/**
 * Products store using Zustand
 */
const useProductsStore = create((set, get) => ({
  products: [],
  currentProduct: null,
  loading: false,
  error: null,
  lastFetched: null,
  fetchAbortFlag: null,

  // Fetch all products с умным кэшированием и stale-while-revalidate
  fetchProducts: async (force = false) => {
    const state = get()
    
    // Отменяем предыдущий запрос если есть
    if (state.fetchAbortFlag) {
      state.fetchAbortFlag.cancelled = true
    }
    
    // Проверяем свежесть кэша
    const hasData = state.products.length > 0
    const cacheAge = state.lastFetched ? Date.now() - state.lastFetched : Infinity
    const isCacheFresh = cacheAge < CACHE_TTL
    
    // Если кэш свежий и не форсируем обновление - возвращаем из кэша
    if (!force && hasData && isCacheFresh) {
      console.log(`[Products] Using cache (age: ${Math.round(cacheAge / 1000)}s)`)
      return
    }
    
    // Stale-while-revalidate: показываем старые данные сразу, обновляем в фоне
    const showLoader = !hasData // Loader только если нет данных вообще
    
    const abortFlag = { cancelled: false }
    set({ loading: showLoader, error: null, fetchAbortFlag: abortFlag })

    try {
      const products = await getProducts()
      
      // Проверяем, не был ли запрос отменен
      if (abortFlag.cancelled) {
        return
      }

      set({ products, loading: false, lastFetched: Date.now(), fetchAbortFlag: null })
      console.log('[Products] Data refreshed from server')
    } catch (error) {
      // Игнорируем ошибки отмененных запросов
      if (abortFlag.cancelled) {
        return
      }
      
      // Если есть старые данные - оставляем их, только логируем ошибку
      if (hasData) {
        console.warn('[Products] Failed to refresh, using stale data:', error.message)
        set({ loading: false, fetchAbortFlag: null })
      } else {
        set({ error: error.message, loading: false, fetchAbortFlag: null })
      }
    }
  },

  // Fetch single product by ID (options.forAdmin: true — для админки, разрешает черновики)
  fetchProduct: async (id, options = {}) => {
    const state = get()
    
    set({ currentProduct: null })
    
    if (state.fetchAbortFlag) {
      state.fetchAbortFlag.cancelled = true
    }

    const abortFlag = { cancelled: false }
    set({ loading: true, error: null, fetchAbortFlag: abortFlag })

    try {
      const product = await getProduct(id, options)
      
      if (abortFlag.cancelled) {
        return
      }

      set({ currentProduct: product, loading: false, fetchAbortFlag: null })
    } catch (error) {
      if (abortFlag.cancelled) {
        return
      }
      set({ 
        error: error.message || 'Продукт не найден', 
        loading: false, 
        fetchAbortFlag: null,
        currentProduct: null 
      })
    }
  },

  clearError: () => set({ error: null }),

  // Fetch single product by slug
  fetchProductBySlug: async (slug) => {
    const state = get()
    
    // Очищаем предыдущий продукт перед загрузкой нового
    set({ currentProduct: null })
    
    // Отменяем предыдущий запрос, если он еще выполняется
    if (state.fetchAbortFlag) {
      state.fetchAbortFlag.cancelled = true
    }

    // Создаем новый флаг отмены
    const abortFlag = { cancelled: false }
    set({ loading: true, error: null, fetchAbortFlag: abortFlag })

    try {
      const product = await getProductBySlug(slug)
      
      // Проверяем, не был ли запрос отменен
      if (abortFlag.cancelled) {
        return
      }

      set({ currentProduct: product, loading: false, fetchAbortFlag: null })
    } catch (error) {
      // Игнорируем ошибки отмененных запросов
      if (abortFlag.cancelled) {
        return
      }
      set({ 
        error: error.message || 'Продукт не найден', 
        loading: false, 
        fetchAbortFlag: null,
        currentProduct: null 
      })
    }
  },

  // Add new product
  addProduct: async (productData) => {
    set({ loading: true, error: null })
    try {
      const newProduct = await createProduct(productData)
      set((state) => ({
        products: [newProduct, ...state.products],
        loading: false,
        lastFetched: Date.now(), // Обновляем timestamp кэша
      }))
      return newProduct
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Update product
  editProduct: async (id, updates) => {
    set({ loading: true, error: null })
    try {
      const updatedProduct = await updateProduct(id, updates)
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? updatedProduct : p)),
        loading: false,
        lastFetched: null, // Инвалидируем кэш - следующий fetch обновит данные
      }))
      return updatedProduct
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Remove product
  removeProduct: async (id) => {
    set({ loading: true, error: null })
    try {
      await deleteProduct(id)
      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
        loading: false,
        lastFetched: Date.now(), // Обновляем timestamp кэша
      }))
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Clear current product
  clearCurrentProduct: () => set({ currentProduct: null }),

  // Optimistic update methods for better encapsulation
  setProductsOptimistic: (optimisticProducts) => {
    set({ products: optimisticProducts })
  },

  rollbackProducts: (previousProducts) => {
    set({ products: previousProducts })
  },

  // Update products order
  updateProductsOrder: async (orderedProducts) => {
    set({ loading: true, error: null })
    try {
      // Создаем массив обновлений для API
      const orderUpdates = orderedProducts.map((product, index) => ({
        id: product.id,
        display_order: index
      }))
      
      await updateProductOrder(orderUpdates)
      
      // Обновляем store с новым порядком
      set((state) => ({
        products: orderedProducts,
        loading: false,
        lastFetched: Date.now(), // Обновляем кэш
      }))
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },
}))

export default useProductsStore

