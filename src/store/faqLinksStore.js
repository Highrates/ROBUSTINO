import { create } from 'zustand'
import { getFAQLinks, getFAQLink, createFAQLink, updateFAQLink, deleteFAQLink, updateFAQLinksOrder } from '@utils/api'

/**
 * FAQ Links store using Zustand
 */
const useFAQLinksStore = create((set, get) => ({
  links: [],
  currentLink: null,
  loading: false,
  error: null,
  lastFetched: null,
  cacheTTL: 30000, // 30 секунд кэш
  fetchAbortFlag: null,

  fetchFAQLinks: async (force = false) => {
    const state = get()
    
    if (!force && state.lastFetched && state.links.length > 0) {
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
      const links = await getFAQLinks()
      
      if (abortFlag.cancelled) {
        return
      }

      set({ links, loading: false, lastFetched: Date.now(), fetchAbortFlag: null })
    } catch (error) {
      if (abortFlag.cancelled) {
        return
      }
      set({ error: error.message, loading: false, fetchAbortFlag: null })
    }
  },

  fetchFAQLink: async (id) => {
    const state = get()
    
    if (state.fetchAbortFlag) {
      state.fetchAbortFlag.cancelled = true
    }

    const abortFlag = { cancelled: false }
    set({ loading: true, error: null, fetchAbortFlag: abortFlag })

    try {
      const link = await getFAQLink(id)
      
      if (abortFlag.cancelled) {
        return
      }

      set({ currentLink: link, loading: false, fetchAbortFlag: null })
    } catch (error) {
      if (abortFlag.cancelled) {
        return
      }
      set({ error: error.message, loading: false, fetchAbortFlag: null })
    }
  },

  addFAQLink: async (linkData) => {
    set({ loading: true, error: null })
    try {
      const newLink = await createFAQLink(linkData)
      set((state) => ({
        links: [...state.links, newLink],
        loading: false,
        lastFetched: Date.now(),
      }))
      return newLink
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  editFAQLink: async (id, updates) => {
    set({ loading: true, error: null })
    try {
      const updatedLink = await updateFAQLink(id, updates)
      set((state) => ({
        links: state.links.map((l) => (l.id === id ? updatedLink : l)),
        loading: false,
        lastFetched: Date.now(),
      }))
      return updatedLink
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  removeFAQLink: async (id) => {
    set({ loading: true, error: null })
    try {
      await deleteFAQLink(id)
      set((state) => ({
        links: state.links.filter((l) => l.id !== id),
        loading: false,
        lastFetched: Date.now(),
      }))
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },

  setLinksOptimistic: (links) => {
    set({ links })
  },

  rollbackLinks: (links) => {
    set({ links })
  },

  updateLinksOrder: async (orderUpdates) => {
    set({ loading: true, error: null })
    try {
      await updateFAQLinksOrder(orderUpdates)
      set((state) => ({
        links: orderUpdates,
        loading: false,
        lastFetched: Date.now(),
      }))
    } catch (error) {
      set({ error: error.message, loading: false })
      throw error
    }
  },
}))

export default useFAQLinksStore
