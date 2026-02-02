import { create } from 'zustand'
import { getArticles, getArticle, getArticleBySlug, createArticle, updateArticle, deleteArticle, updateArticleOrder } from '@utils/api'

// TTL для кэша в памяти (5 минут)
const CACHE_TTL = 5 * 60 * 1000

/**
 * Articles store using Zustand
 */
const useArticlesStore = create((set, get) => ({
  articles: [],
  currentArticle: null,
  loading: false,
  error: null,
  lastFetched: null,
  fetchAbortFlag: null,

  // Fetch all articles с умным кэшированием и stale-while-revalidate
  fetchArticles: async (force = false) => {
    const state = get()
    
    // Отменяем предыдущий запрос если есть
    if (state.fetchAbortFlag) {
      state.fetchAbortFlag.cancelled = true
    }
    
    // Проверяем свежесть кэша
    const hasData = state.articles.length > 0
    const cacheAge = state.lastFetched ? Date.now() - state.lastFetched : Infinity
    const isCacheFresh = cacheAge < CACHE_TTL
    
    // Если кэш свежий и не форсируем обновление - возвращаем из кэша
    if (!force && hasData && isCacheFresh) {
      console.log(`[Articles] Using cache (age: ${Math.round(cacheAge / 1000)}s)`)
      return
    }
    
    // Stale-while-revalidate: показываем старые данные сразу, обновляем в фоне
    const showLoader = !hasData // Loader только если нет данных вообще
    
    const abortFlag = { cancelled: false }
    set({ loading: showLoader, error: null, fetchAbortFlag: abortFlag })

    try {
      const articles = await getArticles()
      
      // Проверяем, не был ли запрос отменен
      if (abortFlag.cancelled) {
        return
      }

      set({ articles, loading: false, lastFetched: Date.now(), fetchAbortFlag: null })
      console.log('[Articles] Data refreshed from server')
    } catch (error) {
      // Игнорируем ошибки отмененных запросов
      if (abortFlag.cancelled) {
        return
      }
      
      // Если есть старые данные - оставляем их, только логируем ошибку
      if (hasData) {
        console.warn('[Articles] Failed to refresh, using stale data:', error.message)
        set({ loading: false, fetchAbortFlag: null })
      } else {
        set({ error: error.message, loading: false, fetchAbortFlag: null })
      }
    }
  },

  // Fetch single article by ID
  fetchArticle: async (id) => {
    const state = get()
    
    // Отменяем предыдущий запрос, если он еще выполняется
    if (state.fetchAbortFlag) {
      state.fetchAbortFlag.cancelled = true
    }

    // Создаем новый флаг отмены и очищаем предыдущую статью
    const abortFlag = { cancelled: false }
    set({ loading: true, error: null, fetchAbortFlag: abortFlag, currentArticle: null })

    try {
      const article = await getArticle(id)
      
      // Проверяем, не был ли запрос отменен
      if (abortFlag.cancelled) {
        return
      }

      console.log('Загружена статья:', article)
      set({ currentArticle: article, loading: false, fetchAbortFlag: null })
    } catch (error) {
      // Игнорируем ошибки отмененных запросов
      if (abortFlag.cancelled) {
        return
      }
      set({ error: error.message, loading: false, fetchAbortFlag: null })
    }
  },

  // Fetch single article by slug
  fetchArticleBySlug: async (slug) => {
    const state = get()
    
    // Отменяем предыдущий запрос, если он еще выполняется
    if (state.fetchAbortFlag) {
      state.fetchAbortFlag.cancelled = true
    }

    // Создаем новый флаг отмены и очищаем предыдущую статью
    const abortFlag = { cancelled: false }
    set({ loading: true, error: null, fetchAbortFlag: abortFlag, currentArticle: null })

    try {
      const article = await getArticleBySlug(slug)
      
      // Проверяем, не был ли запрос отменен
      if (abortFlag.cancelled) {
        return
      }

      set({ currentArticle: article, loading: false, fetchAbortFlag: null })
    } catch (error) {
      // Игнорируем ошибки отмененных запросов
      if (abortFlag.cancelled) {
        return
      }
      set({ error: error.message, loading: false, fetchAbortFlag: null, currentArticle: null })
    }
  },

  // Add new article
  addArticle: async (articleData) => {
    set({ loading: true, error: null })
    try {
      const newArticle = await createArticle(articleData)
      set((state) => ({
        articles: [newArticle, ...state.articles],
        loading: false,
        lastFetched: Date.now(), // Обновляем timestamp кэша
      }))
      return newArticle
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Update article
  editArticle: async (id, updates) => {
    set({ loading: true, error: null })
    try {
      const updatedArticle = await updateArticle(id, updates)
      set((state) => ({
        articles: state.articles.map((a) => (a.id === id ? updatedArticle : a)),
        // Обновляем currentArticle, если это та же статья
        currentArticle: state.currentArticle && state.currentArticle.id === id ? updatedArticle : state.currentArticle,
        loading: false,
        lastFetched: null, // Инвалидируем кэш - следующий fetch обновит данные
      }))
      return updatedArticle
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Remove article
  removeArticle: async (id) => {
    set({ loading: true, error: null })
    try {
      await deleteArticle(id)
      set((state) => ({
        articles: state.articles.filter((a) => a.id !== id),
        loading: false,
        lastFetched: Date.now(), // Обновляем timestamp кэша
      }))
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Clear current article
  clearCurrentArticle: () => set({ currentArticle: null }),

  // Optimistic update methods for better encapsulation
  setArticlesOptimistic: (optimisticArticles) => {
    set({ articles: optimisticArticles })
  },

  rollbackArticles: (previousArticles) => {
    set({ articles: previousArticles })
  },

  // Update articles order
  updateArticlesOrder: async (orderedArticles) => {
    set({ loading: true, error: null })
    try {
      // Создаем массив обновлений для API
      const orderUpdates = orderedArticles.map((article, index) => ({
        id: article.id,
        display_order: index
      }))
      
      await updateArticleOrder(orderUpdates)
      
      // Обновляем store с новым порядком
      set((state) => ({
        articles: orderedArticles,
        loading: false,
        lastFetched: Date.now(), // Обновляем кэш
      }))
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },
}))

export default useArticlesStore
