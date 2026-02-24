import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Создаем клиент только если переменные окружения настроены
// Иначе возвращаем null, чтобы приложение не падало
let supabase = null

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    console.warn('Failed to create Supabase client:', error)
    supabase = null
  }
} else {
  console.warn(
    'Supabase not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file'
  )
  if (import.meta.env.DEV) {
    console.warn(
      'Локально: создайте .env в корне проекта из .env.example и укажите те же VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY, что и на проде (одна БД). После правок .env перезапустите dev-сервер.'
    )
  }
}

if (import.meta.env.DEV && supabase) {
  const url = supabaseUrl.replace(/\/$/, '')
  const isProd = url.includes('robustino.ru')
  console.info('[Supabase] URL:', url, isProd ? '— продовая БД' : '— не прод, проверьте .env')
}

export { supabase }

// Storage buckets
export const BUCKETS = {
  MODELS: 'models', // For 3D GLB files
  IMAGES: 'images', // For product images
  ARTICLES: 'articles', // For article images
  PROJECTS: 'projects', // For project images
  DOCUMENTS: 'documents', // For PDF and other documents
}

