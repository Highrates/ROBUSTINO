import { create } from 'zustand'
import { getProjects, getProject, createProject, updateProject, deleteProject, updateProjectOrder } from '@utils/api'

// TTL для кэша в памяти (5 минут)
const CACHE_TTL = 5 * 60 * 1000

/**
 * Projects store using Zustand
 */
const useProjectsStore = create((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
  lastFetched: null,
  fetchAbortFlag: null,

  // Fetch all projects с умным кэшированием и stale-while-revalidate
  fetchProjects: async (force = false) => {
    const state = get()
    
    // Отменяем предыдущий запрос если есть
    if (state.fetchAbortFlag) {
      state.fetchAbortFlag.cancelled = true
    }
    
    // Проверяем свежесть кэша
    const hasData = state.projects.length > 0
    const cacheAge = state.lastFetched ? Date.now() - state.lastFetched : Infinity
    const isCacheFresh = cacheAge < CACHE_TTL
    
    // Если кэш свежий и не форсируем обновление - возвращаем из кэша
    if (!force && hasData && isCacheFresh) {
      console.log(`[Projects] Using cache (age: ${Math.round(cacheAge / 1000)}s)`)
      return
    }
    
    // Stale-while-revalidate: показываем старые данные сразу, обновляем в фоне
    const showLoader = !hasData // Loader только если нет данных вообще
    
    const abortFlag = { cancelled: false }
    set({ loading: showLoader, error: null, fetchAbortFlag: abortFlag })

    try {
      const projects = await getProjects()
      
      // Проверяем, не был ли запрос отменен
      if (abortFlag.cancelled) {
        return
      }

      set({ projects, loading: false, lastFetched: Date.now(), fetchAbortFlag: null })
      console.log('[Projects] Data refreshed from server')
    } catch (error) {
      // Игнорируем ошибки отмененных запросов
      if (abortFlag.cancelled) {
        return
      }
      
      // Если есть старые данные - оставляем их, только логируем ошибку
      if (hasData) {
        console.warn('[Projects] Failed to refresh, using stale data:', error.message)
        set({ loading: false, fetchAbortFlag: null })
      } else {
        set({ error: error.message, loading: false, fetchAbortFlag: null })
      }
    }
  },

  // Fetch single project
  fetchProject: async (id) => {
    const state = get()
    
    // Отменяем предыдущий запрос, если он еще выполняется
    if (state.fetchAbortFlag) {
      state.fetchAbortFlag.cancelled = true
    }

    // Создаем новый флаг отмены
    const abortFlag = { cancelled: false }
    set({ loading: true, error: null, fetchAbortFlag: abortFlag })

    try {
      const project = await getProject(id)
      
      // Проверяем, не был ли запрос отменен
      if (abortFlag.cancelled) {
        return
      }

      set({ currentProject: project, loading: false, fetchAbortFlag: null })
    } catch (error) {
      // Игнорируем ошибки отмененных запросов
      if (abortFlag.cancelled) {
        return
      }
      set({ error: error.message, loading: false, fetchAbortFlag: null })
    }
  },

  // Add new project
  addProject: async (projectData) => {
    set({ loading: true, error: null })
    try {
      const newProject = await createProject(projectData)
      set((state) => ({
        projects: [newProject, ...state.projects],
        loading: false,
        lastFetched: Date.now(), // Обновляем timestamp кэша
      }))
      return newProject
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Update project
  editProject: async (id, updates) => {
    set({ loading: true, error: null })
    try {
      const updatedProject = await updateProject(id, updates)
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? updatedProject : p)),
        loading: false,
        lastFetched: null, // Инвалидируем кэш - следующий fetch обновит данные
      }))
      return updatedProject
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Remove project
  removeProject: async (id) => {
    set({ loading: true, error: null })
    try {
      await deleteProject(id)
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        loading: false,
        lastFetched: Date.now(), // Обновляем timestamp кэша
      }))
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Clear current project
  clearCurrentProject: () => set({ currentProject: null }),

  // Optimistic update methods for better encapsulation
  setProjectsOptimistic: (optimisticProjects) => {
    set({ projects: optimisticProjects })
  },

  rollbackProjects: (previousProjects) => {
    set({ projects: previousProjects })
  },

  // Update projects order
  updateProjectsOrder: async (orderedProjects) => {
    set({ loading: true, error: null })
    try {
      // Создаем массив обновлений для API
      const orderUpdates = orderedProjects.map((project, index) => ({
        id: project.id,
        display_order: index
      }))
      
      await updateProjectOrder(orderUpdates)
      
      // Обновляем store с новым порядком
      set((state) => ({
        projects: orderedProjects,
        loading: false,
        lastFetched: Date.now(), // Обновляем кэш
      }))
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },
}))

export default useProjectsStore

