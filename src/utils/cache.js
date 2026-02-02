/**
 * Утилита для кэширования данных в localStorage.
 * Используется для кэширования тяжелых ресурсов (3D-модели, изображения, HDR-окружения).
 * API-ответы кэшируются в памяти через Zustand stores с TTL 5 минут.
 */

const CACHE_PREFIX = 'robustino_cache_'
const CACHE_VERSION = '1.0'

/**
 * Простая функция хеширования строки
 * @param {string} str - Строка для хеширования
 * @returns {string} Хеш строки
 */
const simpleHash = (str) => {
  let hash = 0
  if (str.length === 0) return hash.toString()
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * Безопасно преобразует параметры в строку для хеширования
 * @param {any} params - Параметры (строка, объект, число и т.д.)
 * @returns {string} Строковое представление параметров
 */
const paramsToString = (params) => {
  if (!params) return ''
  if (typeof params === 'string') return params
  try {
    return JSON.stringify(params)
  } catch (error) {
    // Если не удалось сериализовать, используем строковое представление
    return String(params)
  }
}

/**
 * Генерирует ключ кэша для ресурса
 * @param {string} resourceName - Название ресурса (например, 'faq', 'products')
 * @param {string|object} params - Дополнительные параметры для уникальности (опционально)
 * @returns {string} Ключ кэша
 */
const getCacheKey = (resourceName, params = '') => {
  const paramsHash = params ? `_${simpleHash(paramsToString(params))}` : ''
  return `${CACHE_PREFIX}${resourceName}${paramsHash}`
}

/**
 * Сохраняет данные в кэш
 * @param {string} resourceName - Название ресурса
 * @param {any} data - Данные для сохранения
 * @param {string} params - Дополнительные параметры (опционально)
 * @param {number} ttl - Время жизни кэша в миллисекундах (по умолчанию 1 час)
 */
export const setCache = (resourceName, data, params = '', ttl = 3600000) => {
  try {
    const cacheKey = getCacheKey(resourceName, params)
    const cacheData = {
      data,
      timestamp: Date.now(),
      ttl,
      version: CACHE_VERSION,
    }
    localStorage.setItem(cacheKey, JSON.stringify(cacheData))
  } catch (error) {
    // Если localStorage переполнен или недоступен, просто игнорируем ошибку
    console.warn('Не удалось сохранить данные в кэш:', error)
  }
}

/**
 * Получает данные из кэша
 * @param {string} resourceName - Название ресурса
 * @param {string} params - Дополнительные параметры (опционально)
 * @returns {any|null} Данные из кэша или null, если кэш недействителен
 */
export const getCache = (resourceName, params = '') => {
  try {
    const cacheKey = getCacheKey(resourceName, params)
    const cached = localStorage.getItem(cacheKey)
    
    if (!cached) {
      return null
    }

    const cacheData = JSON.parse(cached)
    
    // Проверяем версию кэша
    if (cacheData.version !== CACHE_VERSION) {
      // Удаляем устаревший кэш
      localStorage.removeItem(cacheKey)
      return null
    }

    // Проверяем срок действия кэша
    const age = Date.now() - cacheData.timestamp
    if (age > cacheData.ttl) {
      // Кэш истек, удаляем его
      localStorage.removeItem(cacheKey)
      return null
    }

    return cacheData.data
  } catch (error) {
    console.warn('Ошибка при чтении кэша:', error)
    return null
  }
}

/**
 * Проверяет, есть ли валидный кэш для ресурса
 * @param {string} resourceName - Название ресурса
 * @param {string} params - Дополнительные параметры (опционально)
 * @returns {boolean} true, если есть валидный кэш
 */
export const hasValidCache = (resourceName, params = '') => {
  return getCache(resourceName, params) !== null
}

/**
 * Удаляет кэш для конкретного ресурса
 * @param {string} resourceName - Название ресурса
 * @param {string} params - Дополнительные параметры (опционально)
 */
export const clearCache = (resourceName, params = '') => {
  try {
    const cacheKey = getCacheKey(resourceName, params)
    localStorage.removeItem(cacheKey)
  } catch (error) {
    console.warn('Ошибка при очистке кэша:', error)
  }
}

/**
 * Удаляет весь кэш для ресурса по префиксу (все ключи resourceName, resourceName_param1, …).
 * Нужно при сбросе кэша статей/продуктов: список очищается одним ключом, а отдельные
 * записи (по slug) — разными ключами, их все сбрасываем по префиксу.
 * @param {string} resourceName - Название ресурса (например, 'article-by-slug')
 */
export const clearCacheByResourcePrefix = (resourceName) => {
  try {
    const prefix = `${CACHE_PREFIX}${resourceName}`
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key)
      }
    })
  } catch (error) {
    console.warn('Ошибка при очистке кэша по префиксу:', error)
  }
}

/**
 * Очищает весь кэш приложения
 */
export const clearAllCache = () => {
  try {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
  } catch (error) {
    console.warn('Ошибка при очистке всего кэша:', error)
  }
}

/**
 * Получает возраст кэша в миллисекундах
 * @param {string} resourceName - Название ресурса
 * @param {string} params - Дополнительные параметры (опционально)
 * @returns {number|null} Возраст кэша в мс или null, если кэш не существует
 */
export const getCacheAge = (resourceName, params = '') => {
  try {
    const cacheKey = getCacheKey(resourceName, params)
    const cached = localStorage.getItem(cacheKey)
    
    if (!cached) {
      return null
    }

    const cacheData = JSON.parse(cached)
    
    if (cacheData.version !== CACHE_VERSION) {
      return null
    }

    return Date.now() - cacheData.timestamp
  } catch (error) {
    return null
  }
}
