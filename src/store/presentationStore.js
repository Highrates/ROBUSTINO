import { create } from 'zustand'
import { getPresentation, createPresentation, updatePresentation } from '@utils/api'

/**
 * Presentation store using Zustand
 */
const usePresentationStore = create((set, get) => ({
  presentation: null,
  loading: false,
  error: null,
  lastFetched: null,
  cacheTTL: 30000,
  fetchAbortFlag: null,

  fetchPresentation: async (force = false) => {
    const state = get()
    
    if (!force && state.lastFetched && state.presentation) {
      const cacheAge = Date.now() - state.lastFetched
      if (cacheAge < state.cacheTTL) {
        return
      }
    }

    if (state.fetchAbortFlag) {
      state.fetchAbortFlag.cancelled = true
    }

    const abortFlag = { cancelled: false }
    set({ loading: true, error: null, fetchAbortFlag: abortFlag })

    try {
      const presentation = await getPresentation()
      
      if (abortFlag.cancelled) {
        return
      }

      set({ presentation, loading: false, lastFetched: Date.now(), fetchAbortFlag: null })
    } catch (error) {
      if (abortFlag.cancelled) {
        return
      }
      set({ error: error.message, loading: false, fetchAbortFlag: null })
    }
  },

  savePresentation: async (presentationData) => {
    set({ loading: true, error: null })
    try {
      const state = get()
      let savedPresentation
      
      if (state.presentation) {
        savedPresentation = await updatePresentation(presentationData)
      } else {
        savedPresentation = await createPresentation(presentationData)
      }
      
      set({ 
        presentation: savedPresentation, 
        loading: false, 
        lastFetched: Date.now() 
      })
      return savedPresentation
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },
}))

export default usePresentationStore
