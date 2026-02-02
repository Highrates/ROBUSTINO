import { supabase } from '@/config/supabase'

// ========== HELPER: Retry with timeout ==========

/**
 * Выполняет запрос с повторными попытками, экспоненциальной задержкой и таймаутом.
 * Кэширование выполняется на уровне Zustand stores (в памяти, TTL 5 минут).
 * @param {Function} requestFn - Функция запроса
 * @param {Object} options - Опции запроса
 * @param {number} options.maxRetries - Максимальное количество попыток (по умолчанию 4)
 * @param {number} options.timeout - Таймаут в миллисекундах (по умолчанию 45000)
 * @param {string} options.resourceName - Название ресурса для сообщений об ошибках
 * @returns {Promise} Результат запроса
 */
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
      const requestPromise = requestFn()
      const result = await Promise.race([requestPromise, timeoutPromise])
      return result
    } catch (error) {
      lastError = error
      const isNetworkError =
        error.message?.includes('timeout') ||
        error.message?.includes('network') ||
        error.message?.includes('connection') ||
        error.message?.includes('fetch') ||
        error.message?.includes('Load failed') ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('Сетевое соединение потеряно') ||
        error.message?.includes('Network connection lost') ||
        error.name === 'TypeError' ||
        (error.code && ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.code))
      const isCorsError =
        error.message?.includes('access control') ||
        error.message?.includes('CORS') ||
        error.message?.includes('cross-origin')

      if (isCorsError) {
        throw new Error(
          'Ошибка доступа к серверу. Проверьте настройки CORS в Supabase или попробуйте позже.'
        )
      }
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
        if (attempt < maxRetries) {
          console.warn(
            `Попытка ${attempt}/${maxRetries} загрузки ${resourceName} не удалась. Повтор через ${delay / 1000}с...`
          )
        }
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      throw error
    }
  }

  const errorMessage = lastError?.message || 'Неизвестная ошибка'
  throw new Error(`Не удалось загрузить ${resourceName}. ${errorMessage}`)
}

// ========== PRODUCTS ==========

/**
 * Get all products
 * @returns {Promise<Array>} Array of products
 */
export const getProducts = async () => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }
  return fetchWithRetry(
    async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, type, status, created_at, display_order, images, slug, parent_product_id')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(1000)
      if (error) throw error
      return data || []
    },
    { maxRetries: 4, timeout: 45000, resourceName: 'products' }
  )
}

/**
 * Get single product by ID
 * @param {string} id - Product ID
 * @returns {Promise<Object>} Product object
 */
export const getProduct = async (id) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  return fetchWithRetry(
    async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        // Более информативное сообщение об ошибке
        if (error.code === 'PGRST116') {
          throw new Error(`Продукт с ID ${id} не найден. Возможно, он не опубликован или был удален.`)
        }
        
        // Другие ошибки
        throw new Error(error.message || `Ошибка загрузки продукта: ${error.code || 'неизвестная ошибка'}`)
      }
      
      if (!data) {
        throw new Error(`Продукт с ID ${id} не найден`)
      }
      
      // Проверяем статус (на всякий случай, хотя RLS должен это делать)
      if (data.status !== 'published') {
        throw new Error(`Продукт с ID ${id} не опубликован (статус: ${data.status})`)
      }
      
      return data
    },
    { maxRetries: 4, timeout: 45000, resourceName: 'product' }
  )
}

/**
 * Get product by slug
 * @param {string} slug - Product slug
 * @returns {Promise<Object>} Product object
 */
export const getProductBySlug = async (slug) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  return fetchWithRetry(
    async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error(`Продукт со slug "${slug}" не найден. Возможно, он не опубликован или был удален.`)
        }
        throw new Error(error.message || `Ошибка загрузки продукта: ${error.code || 'неизвестная ошибка'}`)
      }
      
      if (!data) {
        throw new Error(`Продукт со slug "${slug}" не найден`)
      }
      
      if (data.status !== 'published') {
        throw new Error(`Продукт со slug "${slug}" не опубликован (статус: ${data.status})`)
      }
      
      return data
    },
    { maxRetries: 4, timeout: 45000, resourceName: 'product-by-slug' }
  )
}

/**
 * Create new product
 * @param {Object} productData - Product data
 * @returns {Promise<Object>} Created product
 */
export const createProduct = async (productData) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  // Если display_order не указан, устанавливаем максимальный порядок + 1
  if (productData.display_order === undefined || productData.display_order === null) {
    try {
      const { data: maxOrderData, error: maxOrderError } = await supabase
        .from('products')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (maxOrderError) {
        console.warn('Ошибка получения максимального порядка:', maxOrderError)
        productData.display_order = 0
      } else {
        productData.display_order = maxOrderData?.display_order != null 
          ? (maxOrderData.display_order + 1) 
          : 0
      }
    } catch (error) {
      console.warn('Ошибка при определении порядка товара:', error)
      productData.display_order = 0
    }
  }

  const { data, error } = await supabase
    .from('products')
    .insert([productData])
    .select()
    .single()
  
  if (error) {
    console.error('Supabase error:', error)
    // Улучшаем сообщение об ошибке
    const errorMsg = error.message || 'Ошибка создания товара'
    throw new Error(errorMsg)
  }
  
  return data
}

/**
 * Update product
 * @param {string} id - Product ID
 * @param {Object} updates - Updated fields
 * @returns {Promise<Object>} Updated product
 */
export const updateProduct = async (id, updates) => {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

/**
 * Delete product
 * @param {string} id - Product ID
 * @returns {Promise<void>}
 */
export const deleteProduct = async (id) => {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

/**
 * Update products order (mass update)
 * @param {Array<{id: string, display_order: number}>} orderUpdates - Array of products with new order
 * @returns {Promise<void>}
 */
export const updateProductOrder = async (orderUpdates) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  // Выполняем обновления в транзакции через Promise.all
  const updates = orderUpdates.map(({ id, display_order }) =>
    supabase
      .from('products')
      .update({ display_order })
      .eq('id', id)
  )

  const results = await Promise.all(updates)
  
  // Проверяем ошибки
  const errors = results.filter(result => result.error)
  if (errors.length > 0) {
    const errorMessages = errors.map(e => e.error.message).join(', ')
    throw new Error(`Ошибка обновления порядка товаров: ${errorMessages}`)
  }
}

// ========== ARTICLES ==========

/**
 * Get all articles
 * @returns {Promise<Array>} Array of articles
 */
export const getArticles = async () => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }
  return fetchWithRetry(
    async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('id, title, subtitle, status, article_date, created_at, display_order, cover_image, published_at, slug')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(1000)
      if (error) throw error
      return data || []
    },
    { maxRetries: 4, timeout: 45000, resourceName: 'articles' }
  )
}

export const getArticle = async (id) => {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

/**
 * Get article by slug
 * @param {string} slug - Article slug
 * @returns {Promise<Object>} Article object
 */
export const getArticleBySlug = async (slug) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  return fetchWithRetry(
    async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('slug', slug)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error(`Статья со slug "${slug}" не найдена. Возможно, она не опубликована или была удалена.`)
        }
        throw new Error(error.message || `Ошибка загрузки статьи: ${error.code || 'неизвестная ошибка'}`)
      }
      
      if (!data) {
        throw new Error(`Статья со slug "${slug}" не найдена`)
      }
      
      if (data.status !== 'published') {
        throw new Error(`Статья со slug "${slug}" не опубликована (статус: ${data.status})`)
      }
      
      return data
    },
    { maxRetries: 4, timeout: 45000, resourceName: 'article-by-slug' }
  )
}

export const createArticle = async (articleData) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  // Если display_order не указан, устанавливаем максимальный порядок + 1
  if (articleData.display_order === undefined || articleData.display_order === null) {
    try {
      const { data: maxOrderData, error: maxOrderError } = await supabase
        .from('articles')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (maxOrderError) {
        console.warn('Ошибка получения максимального порядка:', maxOrderError)
        articleData.display_order = 0
      } else {
        articleData.display_order = maxOrderData?.display_order != null 
          ? (maxOrderData.display_order + 1) 
          : 0
      }
    } catch (error) {
      console.warn('Ошибка при определении порядка статьи:', error)
      articleData.display_order = 0
    }
  }

  const { data, error } = await supabase
    .from('articles')
    .insert([articleData])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const updateArticle = async (id, updates) => {
  const { data, error } = await supabase
    .from('articles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const deleteArticle = async (id) => {
  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

/**
 * Update articles order (mass update)
 * @param {Array<{id: string, display_order: number}>} orderUpdates - Array of articles with new order
 * @returns {Promise<void>}
 */
export const updateArticleOrder = async (orderUpdates) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  // Выполняем обновления в транзакции через Promise.all
  const updates = orderUpdates.map(({ id, display_order }) =>
    supabase
      .from('articles')
      .update({ display_order })
      .eq('id', id)
  )

  const results = await Promise.all(updates)
  
  // Проверяем ошибки
  const errors = results.filter(result => result.error)
  if (errors.length > 0) {
    const errorMessages = errors.map(e => e.error.message).join(', ')
    throw new Error(`Ошибка обновления порядка статей: ${errorMessages}`)
  }
}

// ========== PROJECTS ==========

export const getProjects = async () => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }
  return fetchWithRetry(
    async () => {
      const { data: projects, error } = await supabase
        .from('projects')
        .select('id, name, seats_count, product_id, images, created_at, display_order, description, upholstery_variant, products(id, name, slug)')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(1000)
      if (error) throw error
      return projects || []
    },
    { maxRetries: 4, timeout: 45000, resourceName: 'projects' }
  )
}

/**
 * Get single project by ID
 * @param {string} id - Project ID
 * @returns {Promise<Object>} Project object
 */
export const getProject = async (id) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*, products(id, name, slug)')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export const createProject = async (projectData) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  // Если display_order не указан, устанавливаем максимальный порядок + 1
  if (projectData.display_order === undefined || projectData.display_order === null) {
    try {
      const { data: maxOrderData, error: maxOrderError } = await supabase
        .from('projects')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (maxOrderError) {
        console.warn('Ошибка получения максимального порядка:', maxOrderError)
        projectData.display_order = 0
      } else {
        projectData.display_order = maxOrderData?.display_order != null 
          ? (maxOrderData.display_order + 1) 
          : 0
      }
    } catch (error) {
      console.warn('Ошибка при определении порядка проекта:', error)
      projectData.display_order = 0
    }
  }

  const { data, error } = await supabase
    .from('projects')
    .insert([projectData])
    .select('*, products(id, name, slug)')
    .single()
  
  if (error) {
    console.error('Supabase error:', error)
    throw new Error(error.message || 'Ошибка создания проекта')
  }
  
  return data
}

export const updateProject = async (id, updates) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select('*, products(id, name, slug)')
    .single()
  
  if (error) {
    console.error('Supabase error:', error)
    throw new Error(error.message || 'Ошибка обновления проекта')
  }
  
  return data
}

export const deleteProject = async (id) => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

/**
 * Update projects order (mass update)
 * @param {Array<{id: string, display_order: number}>} orderUpdates - Array of projects with new order
 * @returns {Promise<void>}
 */
export const updateProjectOrder = async (orderUpdates) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  // Выполняем обновления в транзакции через Promise.all
  const updates = orderUpdates.map(({ id, display_order }) =>
    supabase
      .from('projects')
      .update({ display_order })
      .eq('id', id)
  )

  const results = await Promise.all(updates)
  
  // Проверяем ошибки
  const errors = results.filter(result => result.error)
  if (errors.length > 0) {
    const errorMessages = errors.map(e => e.error.message).join(', ')
    throw new Error(`Ошибка обновления порядка проектов: ${errorMessages}`)
  }
}

// ========== FAQ ==========

export const getFAQs = async () => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }
  return fetchWithRetry(
    async () => {
      const { data, error } = await supabase
        .from('faq')
        .select('id, question, answer, display_order, is_active, created_at')
        .order('display_order', { ascending: true })
        .limit(1000)
      if (error) throw error
      return data || []
    },
    { maxRetries: 4, timeout: 45000, resourceName: 'faq' }
  )
}

/**
 * Get single FAQ by ID
 * @param {string} id - FAQ ID
 * @returns {Promise<Object>} FAQ object
 */
export const getFAQ = async (id) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  const { data, error } = await supabase
    .from('faq')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Supabase error:', error)
    throw new Error(error.message || 'Ошибка получения FAQ')
  }
  
  return data
}

export const createFAQ = async (faqData) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  // Если display_order не указан, устанавливаем максимальный порядок + 1
  if (faqData.display_order === undefined || faqData.display_order === null) {
    try {
      const { data: maxOrderData, error: maxOrderError } = await supabase
        .from('faq')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (maxOrderError) {
        console.warn('Ошибка получения максимального порядка:', maxOrderError)
        faqData.display_order = 0
      } else {
        faqData.display_order = maxOrderData?.display_order != null 
          ? (maxOrderData.display_order + 1) 
          : 0
      }
    } catch (error) {
      console.warn('Ошибка при определении порядка FAQ:', error)
      faqData.display_order = 0
    }
  }

  const { data, error } = await supabase
    .from('faq')
    .insert([faqData])
    .select()
    .single()
  
  if (error) {
    console.error('Supabase error:', error)
    throw new Error(error.message || 'Ошибка создания FAQ')
  }
  
  return data
}

export const updateFAQ = async (id, updates) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  const { data, error } = await supabase
    .from('faq')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    console.error('Supabase error:', error)
    throw new Error(error.message || 'Ошибка обновления FAQ')
  }
  
  return data
}

export const deleteFAQ = async (id) => {
  const { error } = await supabase
    .from('faq')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

/**
 * Update FAQs order (mass update)
 * @param {Array<{id: string, display_order: number}>} orderUpdates - Array of FAQs with new order
 * @returns {Promise<void>}
 */
export const updateFAQOrder = async (orderUpdates) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  // Выполняем обновления в транзакции через Promise.all
  const updates = orderUpdates.map(({ id, display_order }) =>
    supabase
      .from('faq')
      .update({ display_order })
      .eq('id', id)
  )

  const results = await Promise.all(updates)
  
  // Проверяем ошибки
  const errors = results.filter(result => result.error)
  if (errors.length > 0) {
    const errorMessages = errors.map(e => e.error.message).join(', ')
    throw new Error(`Ошибка обновления порядка FAQ: ${errorMessages}`)
  }
}

// ========================================
// FAQ LINKS API
// ========================================

export const getFAQLinks = async () => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }
  return fetchWithRetry(
    async () => {
      const { data, error } = await supabase
        .from('faq_links')
        .select('id, name, document_url, rich_text, display_order, is_active, is_internal_page, page_content, created_at')
        .order('display_order', { ascending: true })
        .limit(1000)
      if (error) throw error
      return data || []
    },
    { maxRetries: 4, timeout: 45000, resourceName: 'faq-links' }
  )
}

export const getFAQLink = async (id) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  const { data, error } = await supabase
    .from('faq_links')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Supabase error:', error)
    throw new Error(error.message || 'Ошибка получения FAQ Link')
  }
  
  return data
}

export const createFAQLink = async (linkData) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  // Если display_order не указан, устанавливаем максимальный порядок + 1
  if (linkData.display_order === undefined || linkData.display_order === null) {
    try {
      const { data: maxOrderData, error: maxOrderError } = await supabase
        .from('faq_links')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (maxOrderError) {
        console.warn('Ошибка получения максимального порядка:', maxOrderError)
        linkData.display_order = 0
      } else {
        linkData.display_order = maxOrderData?.display_order != null 
          ? (maxOrderData.display_order + 1) 
          : 0
      }
    } catch (error) {
      console.warn('Ошибка при определении порядка FAQ Link:', error)
      linkData.display_order = 0
    }
  }

  const { data, error } = await supabase
    .from('faq_links')
    .insert([linkData])
    .select()
    .single()
  
  if (error) {
    console.error('Supabase error:', error)
    throw new Error(error.message || 'Ошибка создания FAQ Link')
  }
  
  return data
}

export const updateFAQLink = async (id, updates) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  const { data, error } = await supabase
    .from('faq_links')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    console.error('Supabase error:', error)
    throw new Error(error.message || 'Ошибка обновления FAQ Link')
  }
  
  return data
}

export const deleteFAQLink = async (id) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  const { error } = await supabase
    .from('faq_links')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

export const updateFAQLinksOrder = async (orderUpdates) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  const updates = orderUpdates.map(({ id, display_order }) =>
    supabase
      .from('faq_links')
      .update({ display_order })
      .eq('id', id)
  )

  const results = await Promise.all(updates)
  
  const errors = results.filter(result => result.error)
  if (errors.length > 0) {
    const errorMessages = errors.map(e => e.error.message).join(', ')
    throw new Error(`Ошибка обновления порядка FAQ Links: ${errorMessages}`)
  }
}

// ========================================
// PRESENTATION API
// ========================================

export const getPresentation = async () => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }
  return fetchWithRetry(
    async () => {
      const { data, error } = await supabase
        .from('presentation')
        .select('id, name, document_url, created_at, updated_at')
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
    { maxRetries: 4, timeout: 45000, resourceName: 'presentation' }
  )
}

export const createPresentation = async (presentationData) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  // Проверяем, есть ли уже запись
  const existing = await getPresentation()
  
  if (existing) {
    // Обновляем существующую запись
    const { data, error } = await supabase
      .from('presentation')
      .update(presentationData)
      .eq('id', existing.id)
      .select()
      .single()
    
    if (error) {
      console.error('Supabase error:', error)
      throw new Error(error.message || 'Ошибка обновления Presentation')
    }
    
    return data
  } else {
    // Создаем новую запись
    const { data, error } = await supabase
      .from('presentation')
      .insert([presentationData])
      .select()
      .single()
    
    if (error) {
      console.error('Supabase error:', error)
      throw new Error(error.message || 'Ошибка создания Presentation')
    }
    
    return data
  }
}

export const updatePresentation = async (updates) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  const existing = await getPresentation()
  
  if (!existing) {
    throw new Error('Presentation не найдена')
  }

  const { data, error } = await supabase
    .from('presentation')
    .update(updates)
    .eq('id', existing.id)
    .select()
    .single()
  
  if (error) {
    console.error('Supabase error:', error)
    throw new Error(error.message || 'Ошибка обновления Presentation')
  }
  
  return data
}

// ========== UPHOLSTERY VARIANTS ==========

export const getUpholsteryVariants = async () => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }
  return fetchWithRetry(
    async () => {
      const { data, error } = await supabase
        .from('upholstery_variants')
        .select('id, name, color, image_url, created_at, collection_id, upholstery_collections(id, name)')
        .order('created_at', { ascending: false })
        .limit(1000)
      if (error) throw error
      return data || []
    },
    { maxRetries: 4, timeout: 45000, resourceName: 'upholstery-variants' }
  )
}

/**
 * Get single upholstery variant by ID
 * @param {string} id - Upholstery variant ID
 * @returns {Promise<Object>} Upholstery variant object
 */
export const getUpholsteryVariant = async (id) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  const { data, error } = await supabase
    .from('upholstery_variants')
    .select('*, upholstery_collections(id, name)')
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Supabase error:', error)
    throw new Error(error.message || 'Ошибка получения варианта обивки')
  }
  
  return data
}

export const createUpholsteryVariant = async (variantData) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  const { data, error } = await supabase
    .from('upholstery_variants')
    .insert([variantData])
    .select()
    .single()
  
  if (error) {
    console.error('Supabase error:', error)
    throw new Error(error.message || 'Ошибка создания варианта обивки')
  }
  
  return data
}

export const updateUpholsteryVariant = async (id, updates) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  const { data, error } = await supabase
    .from('upholstery_variants')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    console.error('Supabase error:', error)
    throw new Error(error.message || 'Ошибка обновления варианта обивки')
  }
  
  return data
}

export const deleteUpholsteryVariant = async (id) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  const { error } = await supabase
    .from('upholstery_variants')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Supabase error:', error)
    throw new Error(error.message || 'Ошибка удаления варианта обивки')
  }
}

// ========== UPHOLSTERY COLLECTIONS ==========

/**
 * Get all upholstery collections
 * @returns {Promise<Array>} Array of collection objects
 */
export const getUpholsteryCollections = async () => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }
  return fetchWithRetry(
    async () => {
      const { data, error } = await supabase
        .from('upholstery_collections')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })
      if (error) throw error
      return data || []
    },
    { maxRetries: 4, timeout: 45000, resourceName: 'upholstery-collections' }
  )
}

/**
 * Get single collection by ID
 * @param {string} id - Collection ID
 * @returns {Promise<Object>} Collection object
 */
export const getUpholsteryCollection = async (id) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  const { data, error } = await supabase
    .from('upholstery_collections')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Supabase error:', error)
    throw new Error(error.message || 'Ошибка получения коллекции')
  }
  
  return data
}

/**
 * Get or create collection by name (for auto-creation)
 * @param {string} name - Collection name
 * @returns {Promise<Object>} Collection object
 */
export const getOrCreateCollection = async (name) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  if (!name || !name.trim()) {
    return null
  }

  const trimmedName = name.trim()

  // Сначала пытаемся найти существующую коллекцию
  const { data: existing, error: findError } = await supabase
    .from('upholstery_collections')
    .select('*')
    .eq('name', trimmedName)
    .maybeSingle()

  if (findError && findError.code !== 'PGRST116') {
    console.error('Supabase error:', findError)
    throw new Error(findError.message || 'Ошибка поиска коллекции')
  }

  if (existing) {
    return existing
  }

  // Если коллекция не найдена, создаем новую
  const { data: newCollection, error: createError } = await supabase
    .from('upholstery_collections')
    .insert([{ name: trimmedName }])
    .select()
    .single()

  if (createError) {
    console.error('Supabase error:', createError)
    throw new Error(createError.message || 'Ошибка создания коллекции')
  }

  return newCollection
}

/**
 * Create new collection
 * @param {Object} collectionData - Collection data
 * @returns {Promise<Object>} Created collection
 */
export const createUpholsteryCollection = async (collectionData) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  const { data, error } = await supabase
    .from('upholstery_collections')
    .insert([collectionData])
    .select()
    .single()
  
  if (error) {
    console.error('Supabase error:', error)
    throw new Error(error.message || 'Ошибка создания коллекции')
  }
  
  return data
}

/**
 * Update collection
 * @param {string} id - Collection ID
 * @param {Object} updates - Updates object
 * @returns {Promise<Object>} Updated collection
 */
export const updateUpholsteryCollection = async (id, updates) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  const { data, error } = await supabase
    .from('upholstery_collections')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    console.error('Supabase error:', error)
    throw new Error(error.message || 'Ошибка обновления коллекции')
  }
  
  return data
}

/**
 * Delete collection
 * @param {string} id - Collection ID
 * @returns {Promise<void>}
 */
export const deleteUpholsteryCollection = async (id) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  const { error } = await supabase
    .from('upholstery_collections')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Supabase error:', error)
    throw new Error(error.message || 'Ошибка удаления коллекции')
  }
}

/**
 * Get unique colors from upholstery variants (for filtering)
 * @returns {Promise<Array<string>>} Array of unique color names
 */
export const getUpholsteryColors = async () => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }
  return fetchWithRetry(
    async () => {
      const { data, error } = await supabase
        .from('upholstery_variants')
        .select('color')
        .not('color', 'is', null)
      if (error) throw error
      const uniqueColors = [...new Set(data.map(v => v.color).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'ru'))
      return uniqueColors
    },
    { maxRetries: 4, timeout: 45000, resourceName: 'upholstery-colors' }
  )
}

// ========== PRODUCT PROJECTS (Many-to-Many) ==========

/**
 * Get projects for a product
 * @param {string} productId - Product ID
 * @returns {Promise<Array>} Array of projects
 */
export const getProductProjects = async (productId) => {
  const { data, error } = await supabase
    .from('product_projects')
    .select('projects(*)')
    .eq('product_id', productId)
  
  if (error) throw error
  // Извлекаем проекты из вложенной структуры
  return data.map(item => item.projects).filter(p => p !== null)
}

/**
 * Set projects for a product (replaces existing)
 * @param {string} productId - Product ID
 * @param {Array<string>} projectIds - Array of project IDs
 * @returns {Promise<void>}
 */
export const setProductProjects = async (productId, projectIds) => {
  // Удаляем существующие связи
  const { error: deleteError } = await supabase
    .from('product_projects')
    .delete()
    .eq('product_id', productId)
  
  if (deleteError) throw deleteError

  // Создаем новые связи
  if (projectIds && projectIds.length > 0) {
    const links = projectIds.map(projId => ({
      product_id: productId,
      project_id: projId
    }))

    const { error: insertError } = await supabase
      .from('product_projects')
      .insert(links)
    
    if (insertError) throw insertError
  }
}

// ========== FILE UPLOAD ==========

/**
 * Upload file to Supabase storage
 * @param {File} file - File to upload
 * @param {string} bucket - Storage bucket name
 * @param {string} path - File path in bucket
 * @param {Function} onProgress - Optional progress callback (0-100)
 * @returns {Promise<Object>} Upload result with public URL
 */
export const uploadFile = async (file, bucket, path, onProgress) => {
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  // Убираем проверку bucket через listBuckets - она может не работать из-за RLS
  // Вместо этого просто пытаемся загрузить и обрабатываем ошибку

  // Простая загрузка с таймаутом
  const uploadPromise = supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    })

  // Симулируем прогресс для больших файлов
  if (onProgress && file.size > 1024 * 1024) {
    const progressInterval = setInterval(() => {
      // Простая симуляция прогресса (не точная, но лучше чем ничего)
      if (onProgress) {
        const current = Math.min(90, (Date.now() % 100) * 0.9) // Симуляция до 90%
        onProgress(current)
      }
    }, 100)
    
    try {
      const { data, error } = await uploadPromise
      
      clearInterval(progressInterval)
      if (onProgress) onProgress(100)
      
      if (error) {
        if (error.message?.includes('already exists')) {
          throw new Error('Файл с таким именем уже существует')
        }
        if (error.message?.includes('Bucket not found') || error.message?.includes('bucket not found')) {
          throw new Error(`Bucket "${bucket}" не найден. Создайте bucket в Supabase Dashboard -> Storage`)
        }
        if (error.message?.includes('row-level security') || error.statusCode === 403) {
          throw new Error('Ошибка доступа. Проверьте политики RLS для Storage')
        }
        throw error
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)
      
      return { 
        ...data, 
        publicUrl: urlData.publicUrl,
        path: data.path
      }
    } catch (err) {
      clearInterval(progressInterval)
      throw err
    }
  } else {
    // Для маленьких файлов загружаем без симуляции прогресса
    const { data, error } = await uploadPromise
    
    if (error) {
      if (error.message?.includes('already exists')) {
        throw new Error('Файл с таким именем уже существует')
      }
      if (error.message?.includes('Bucket not found') || error.message?.includes('bucket not found')) {
        throw new Error(`Bucket "${bucket}" не найден. Создайте bucket в Supabase Dashboard -> Storage`)
      }
      if (error.message?.includes('row-level security') || error.statusCode === 403) {
        throw new Error('Ошибка доступа. Проверьте политики RLS для Storage')
      }
      throw error
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)
    
    if (onProgress) onProgress(100)
    
    return { 
      ...data, 
      publicUrl: urlData.publicUrl,
      path: data.path
    }
  }
}

/**
 * Delete file from storage
 * @param {string} bucket - Storage bucket name
 * @param {string} path - File path in bucket
 * @returns {Promise<void>}
 */
export const deleteFile = async (bucket, path) => {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])
  
  if (error) throw error
}

