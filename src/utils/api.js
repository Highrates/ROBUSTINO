import { apiFetch, API_BASE, hasSession } from '@/utils/http'

const fetchWithRetry = async (
  requestFn,
  { maxRetries = 4, timeout = 45000, resourceName = 'данные' } = {}
) => {
  let lastError = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      })
      return await Promise.race([requestFn(), timeoutPromise])
    } catch (error) {
      lastError = error
      const isNetworkError =
        error.message?.includes('timeout') ||
        error.message?.includes('network') ||
        error.message?.includes('connection') ||
        error.message?.includes('fetch') ||
        error.message?.includes('Load failed') ||
        error.message?.includes('Failed to fetch') ||
        error.name === 'TypeError'

      if (attempt === maxRetries) {
        if (isNetworkError) {
          throw new Error(
            `Не удалось загрузить ${resourceName}. Проверьте интернет-соединение и попробуйте обновить страницу.`
          )
        }
        break
      }
      if (isNetworkError) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000)
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      throw error
    }
  }

  throw new Error(`Не удалось загрузить ${resourceName}. ${lastError?.message || ''}`)
}

// ========== PRODUCTS ==========

export const getProducts = async () =>
  fetchWithRetry(() => apiFetch('/products'), { resourceName: 'products' })

export const getProduct = async (id, options = {}) => {
  const data = await fetchWithRetry(() => apiFetch(`/products/${id}`), { resourceName: 'product' })
  if (!options.forAdmin && data.status !== 'published' && !hasSession()) {
    throw new Error(`Продукт с ID ${id} не опубликован (статус: ${data.status})`)
  }
  return data
}

export const getProductBySlug = async (slug, options = {}) => {
  const q = options.token ? `?token=${encodeURIComponent(options.token)}` : ''
  const data = await fetchWithRetry(() => apiFetch(`/products/slug/${encodeURIComponent(slug)}${q}`), {
    resourceName: 'product-by-slug',
  })
  if (!options.forAdmin && data.status !== 'published' && data.status !== 'link_only' && !hasSession()) {
    throw new Error(`Продукт со slug "${slug}" не опубликован`)
  }
  return data
}

export const createProduct = async (productData) =>
  apiFetch('/products', { method: 'POST', body: productData })

export const updateProduct = async (id, updates) =>
  apiFetch(`/products/${id}`, { method: 'PATCH', body: updates })

export const deleteProduct = async (id) => apiFetch(`/products/${id}`, { method: 'DELETE' })

export const updateProductOrder = async (orderUpdates) =>
  apiFetch('/products/order', { method: 'PUT', body: { orderUpdates } })

// ========== ARTICLES ==========

export const getArticles = async () =>
  fetchWithRetry(() => apiFetch('/articles'), { resourceName: 'articles' })

export const getArticle = async (id) => apiFetch(`/articles/${id}`)

export const getArticleBySlug = async (slug) =>
  fetchWithRetry(() => apiFetch(`/articles/slug/${encodeURIComponent(slug)}`), {
    resourceName: 'article-by-slug',
  })

export const createArticle = async (articleData) =>
  apiFetch('/articles', { method: 'POST', body: articleData })

export const updateArticle = async (id, updates) =>
  apiFetch(`/articles/${id}`, { method: 'PATCH', body: updates })

export const deleteArticle = async (id) => apiFetch(`/articles/${id}`, { method: 'DELETE' })

export const updateArticleOrder = async (orderUpdates) =>
  apiFetch('/articles/order', { method: 'PUT', body: { orderUpdates } })

// ========== PROJECTS ==========

export const getProjects = async () =>
  fetchWithRetry(() => apiFetch('/projects'), { resourceName: 'projects' })

export const getProject = async (id) => apiFetch(`/projects/${id}`)

export const createProject = async (projectData) =>
  apiFetch('/projects', { method: 'POST', body: projectData })

export const updateProject = async (id, updates) =>
  apiFetch(`/projects/${id}`, { method: 'PATCH', body: updates })

export const deleteProject = async (id) => apiFetch(`/projects/${id}`, { method: 'DELETE' })

export const updateProjectOrder = async (orderUpdates) =>
  apiFetch('/projects/order', { method: 'PUT', body: { orderUpdates } })

// ========== FAQ ==========

export const getFAQs = async () =>
  fetchWithRetry(() => apiFetch('/faq'), { resourceName: 'faq' })

export const getFAQ = async (id) => apiFetch(`/faq/${id}`)

export const createFAQ = async (faqData) => apiFetch('/faq', { method: 'POST', body: faqData })

export const updateFAQ = async (id, updates) =>
  apiFetch(`/faq/${id}`, { method: 'PATCH', body: updates })

export const deleteFAQ = async (id) => apiFetch(`/faq/${id}`, { method: 'DELETE' })

export const updateFAQOrder = async (orderUpdates) =>
  apiFetch('/faq/order', { method: 'PUT', body: { orderUpdates } })

// ========== FAQ LINKS ==========

export const getFAQLinks = async () =>
  fetchWithRetry(() => apiFetch('/faq-links'), { resourceName: 'faq-links' })

export const getFAQLink = async (id) => apiFetch(`/faq-links/${id}`)

export const createFAQLink = async (linkData) =>
  apiFetch('/faq-links', { method: 'POST', body: linkData })

export const updateFAQLink = async (id, updates) =>
  apiFetch(`/faq-links/${id}`, { method: 'PATCH', body: updates })

export const deleteFAQLink = async (id) => apiFetch(`/faq-links/${id}`, { method: 'DELETE' })

export const updateFAQLinksOrder = async (orderUpdates) =>
  apiFetch('/faq-links/order', { method: 'PUT', body: { orderUpdates } })

// ========== PRESENTATION ==========

export const getPresentation = async () =>
  fetchWithRetry(() => apiFetch('/presentation'), { resourceName: 'presentation' })

export const createPresentation = async (presentationData) =>
  apiFetch('/presentation', { method: 'POST', body: presentationData })

export const updatePresentation = async (updates) =>
  apiFetch('/presentation', { method: 'PATCH', body: updates })

// ========== UPHOLSTERY ==========

export const getUpholsteryVariants = async () =>
  fetchWithRetry(() => apiFetch('/upholstery/variants'), { resourceName: 'upholstery' })

export const getUpholsteryVariant = async (id) => apiFetch(`/upholstery/variants/${id}`)

export const createUpholsteryVariant = async (variantData) =>
  apiFetch('/upholstery/variants', { method: 'POST', body: variantData })

export const updateUpholsteryVariant = async (id, updates) =>
  apiFetch(`/upholstery/variants/${id}`, { method: 'PATCH', body: updates })

export const deleteUpholsteryVariant = async (id) =>
  apiFetch(`/upholstery/variants/${id}`, { method: 'DELETE' })

export const getUpholsteryCollections = async () =>
  fetchWithRetry(() => apiFetch('/upholstery/collections'), { resourceName: 'collections' })

export const getUpholsteryCollection = async (id) => apiFetch(`/upholstery/collections/${id}`)

export const getOrCreateCollection = async (name) =>
  apiFetch('/upholstery/collections/get-or-create', { method: 'POST', body: { name } })

export const createUpholsteryCollection = async (collectionData) =>
  apiFetch('/upholstery/collections', { method: 'POST', body: collectionData })

export const updateUpholsteryCollection = async (id, updates) =>
  apiFetch(`/upholstery/collections/${id}`, { method: 'PATCH', body: updates })

export const deleteUpholsteryCollection = async (id) =>
  apiFetch(`/upholstery/collections/${id}`, { method: 'DELETE' })

export const getUpholsteryColors = async () => apiFetch('/upholstery/colors')

// ========== PRODUCT PROJECTS ==========

export const getProductProjects = async (productId) =>
  apiFetch(`/product-projects/${productId}`)

export const setProductProjects = async (productId, projectIds) =>
  apiFetch(`/product-projects/${productId}`, { method: 'PUT', body: { projectIds } })

// ========== FILE UPLOAD ==========

export const uploadFile = async (file, bucket, path, onProgress) => {
  const formData = new FormData()
  formData.append('file', file)

  const url = `${API_BASE}/upload/${encodeURIComponent(bucket)}?path=${encodeURIComponent(path)}`

  // XHR for progress
  if (onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', url)
      xhr.withCredentials = true
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      }
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText || '{}')
          if (xhr.status >= 200 && xhr.status < 300) {
            onProgress?.(100)
            resolve(data)
          } else reject(new Error(data.error || 'Upload failed'))
        } catch (e) {
          reject(e)
        }
      }
      xhr.onerror = () => reject(new Error('Upload failed'))
      xhr.send(formData)
    })
  }

  return apiFetch(`/upload/${encodeURIComponent(bucket)}?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    formData,
  })
}

export const deleteFile = async (bucket, path) =>
  apiFetch(`/upload/${encodeURIComponent(bucket)}?path=${encodeURIComponent(path)}`, {
    method: 'DELETE',
  })
