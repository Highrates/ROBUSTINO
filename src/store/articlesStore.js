import { create } from 'zustand'
import { getArticles, getArticle, getArticleBySlug, createArticle, updateArticle, deleteArticle, updateArticleOrder } from '@utils/api'

/**
 * Articles store using Zustand
 */
const useArticlesStore = create((set, get) => ({
  articles: [],
  currentArticle: null,
  loading: false,
  error: null,
  lastFetched: null,
  cacheTTL: 30000, // 30 секунд кэш
  fetchAbortFlag: null, // Флаг для отмены запросов

  // Fetch all articles
  fetchArticles: async (force = false) => {
    const state = get()
    
    // Проверяем кэш, если не принудительная загрузка
    // Если данных нет (первый запуск), всегда загружаем
    if (!force && state.lastFetched && state.articles.length > 0) {
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
      const articles = await getArticles()
      
      // Проверяем, не был ли запрос отменен
      if (abortFlag.cancelled) {
        return
      }

      set({ articles, loading: false, lastFetched: Date.now(), fetchAbortFlag: null })
    } catch (error) {
      // Игнорируем ошибки отмененных запросов
      if (abortFlag.cancelled) {
        return
      }
      set({ error: error.message, loading: false, fetchAbortFlag: null })
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
        lastFetched: Date.now(), // Обновляем кэш
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
        lastFetched: Date.now(), // Обновляем кэш
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
        lastFetched: Date.now(), // Обновляем кэш
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
