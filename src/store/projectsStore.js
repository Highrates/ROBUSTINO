import { create } from 'zustand'
import { getProjects, getProject, createProject, updateProject, deleteProject, updateProjectOrder } from '@utils/api'

/**
 * Projects store using Zustand
 */
const useProjectsStore = create((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
  lastFetched: null,
  cacheTTL: 30000, // 30 секунд кэш
  fetchAbortFlag: null, // Флаг для отмены запросов

  // Fetch all projects
  fetchProjects: async (force = false) => {
    const state = get()
    
    // Проверяем кэш, если не принудительная загрузка
    // Если данных нет (первый запуск), всегда загружаем
    if (!force && state.lastFetched && state.projects.length > 0) {
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
      const projects = await getProjects()
      
      // Проверяем, не был ли запрос отменен
      if (abortFlag.cancelled) {
        return
      }

      set({ projects, loading: false, lastFetched: Date.now(), fetchAbortFlag: null })
    } catch (error) {
      // Игнорируем ошибки отмененных запросов
      if (abortFlag.cancelled) {
        return
      }
      set({ error: error.message, loading: false, fetchAbortFlag: null })
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
        lastFetched: Date.now(), // Обновляем кэш
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
        lastFetched: Date.now(), // Обновляем кэш
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
        lastFetched: Date.now(), // Обновляем кэш
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

