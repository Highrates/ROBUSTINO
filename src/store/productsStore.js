import { create } from 'zustand'
import { getProducts, getProduct, createProduct, updateProduct, deleteProduct, updateProductOrder } from '@utils/api'

/**
 * Products store using Zustand
 */
const useProductsStore = create((set, get) => ({
  products: [],
  currentProduct: null,
  loading: false,
  error: null,
  lastFetched: null,
  cacheTTL: 30000, // 30 секунд кэш
  fetchAbortFlag: null, // Флаг для отмены запросов

  // Fetch all products
  fetchProducts: async (force = false) => {
    const state = get()
    
    // Проверяем кэш, если не принудительная загрузка
    // Если данных нет (первый запуск), всегда загружаем
    if (!force && state.lastFetched && state.products.length > 0) {
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
      const products = await getProducts()
      
      // Проверяем, не был ли запрос отменен
      if (abortFlag.cancelled) {
        return // Игнорируем результат отмененного запроса
      }

      set({ products, loading: false, lastFetched: Date.now(), fetchAbortFlag: null })
    } catch (error) {
      // Игнорируем ошибки отмененных запросов
      if (abortFlag.cancelled) {
        return
      }
      set({ error: error.message, loading: false, fetchAbortFlag: null })
    }
  },

  // Fetch single product
  fetchProduct: async (id) => {
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
      const product = await getProduct(id)
      
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
        lastFetched: Date.now(), // Обновляем кэш
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
        lastFetched: Date.now(), // Обновляем кэш
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
        lastFetched: Date.now(), // Обновляем кэш
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

