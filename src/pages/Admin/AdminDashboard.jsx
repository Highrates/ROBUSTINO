import { useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '@components/admin/AdminLayout'
import useProductsStore from '@store/productsStore'
import useArticlesStore from '@store/articlesStore'
import useProjectsStore from '@store/projectsStore'
import useFAQStore from '@store/faqStore'

const AdminDashboard = () => {
  const { products, fetchProducts, loading: productsLoading } = useProductsStore()
  const { articles, fetchArticles, loading: articlesLoading } = useArticlesStore()
  const { projects, fetchProjects, loading: projectsLoading } = useProjectsStore()
  const { faqs, fetchFAQs, loading: faqsLoading } = useFAQStore()

  // Мемоизируем вычисление состояния загрузки
  const isLoading = useMemo(
    () => productsLoading || articlesLoading || projectsLoading || faqsLoading,
    [productsLoading, articlesLoading, projectsLoading, faqsLoading]
  )
  const debounceTimerRef = useRef(null)
  const isFirstMountRef = useRef(true)

  useEffect(() => {
    // При первом монтировании загружаем сразу, без debounce
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false
      // Параллельная загрузка всех данных
      Promise.all([
        fetchProducts(),
        fetchArticles(),
        fetchProjects(),
        fetchFAQs(),
      ]).catch((error) => {
        console.error('Ошибка загрузки данных Dashboard:', error)
      })
      return
    }

    // Для повторных вызовов используем debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      // Параллельная загрузка всех данных
      Promise.all([
        fetchProducts(),
        fetchArticles(),
        fetchProjects(),
        fetchFAQs(),
      ]).catch((error) => {
        console.error('Ошибка загрузки данных Dashboard:', error)
      })
    }, 300) // 300ms debounce для повторных загрузок

    // Очистка при размонтировании или изменении зависимостей
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [fetchProducts, fetchArticles, fetchProjects, fetchFAQs])

  // Мемоизируем вычисление статистики - пересчитывается только при изменении данных
  const stats = useMemo(() => {
    // Вычисляем статистику по товарам
    const productsPublished = products.filter(p => p.status === 'published').length
    const productsDraft = products.filter(p => p.status === 'draft').length
    
    // Вычисляем статистику по статьям
    const articlesPublished = articles.filter(a => a.status === 'published').length
    const articlesDraft = articles.filter(a => a.status === 'draft').length
    
    // Вычисляем статистику по FAQ
    const faqsActive = faqs.filter(f => f.is_active).length
    
    return {
      products: {
        total: products.length,
        published: productsPublished,
        draft: productsDraft,
      },
      articles: {
        total: articles.length,
        published: articlesPublished,
        draft: articlesDraft,
      },
      projects: {
        total: projects.length,
      },
      faqs: {
        total: faqs.length,
        active: faqsActive,
      },
    }
  }, [products, articles, projects, faqs])

  return (
    <AdminLayout>
      <div className="admin-dashboard">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Админ панель</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Товары */}
          <Link
            to="/admin/products"
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
          >
            <h3 className="text-gray-500 text-sm mb-2">Товаров</h3>
            {isLoading ? (
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-900">{stats.products.total}</p>
                <div className="mt-2 flex gap-2 text-xs">
                  <span className="text-green-600">Опубликовано: {stats.products.published}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500">Черновиков: {stats.products.draft}</span>
                </div>
              </>
            )}
          </Link>

          {/* Статьи */}
          <Link
            to="/admin/articles"
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
          >
            <h3 className="text-gray-500 text-sm mb-2">Статей</h3>
            {isLoading ? (
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-900">{stats.articles.total}</p>
                <div className="mt-2 flex gap-2 text-xs">
                  <span className="text-green-600">Опубликовано: {stats.articles.published}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500">Черновиков: {stats.articles.draft}</span>
                </div>
              </>
            )}
          </Link>

          {/* Проекты */}
          <Link
            to="/admin/projects"
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
          >
            <h3 className="text-gray-500 text-sm mb-2">Проектов</h3>
            {isLoading ? (
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <p className="text-3xl font-bold text-gray-900">{stats.projects.total}</p>
            )}
          </Link>

          {/* FAQ */}
          <Link
            to="/admin/faq"
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
          >
            <h3 className="text-gray-500 text-sm mb-2">FAQ</h3>
            {isLoading ? (
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-900">{stats.faqs.total}</p>
                <div className="mt-2 text-xs">
                  <span className="text-green-600">Активных: {stats.faqs.active}</span>
                </div>
              </>
            )}
          </Link>
        </div>

        {/* Дополнительные разделы */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          {/* Ссылки FAQ */}
          <Link
            to="/admin/faq-links"
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
          >
            <h3 className="text-gray-500 text-sm mb-2">Ссылки FAQ</h3>
            <p className="text-sm text-gray-600 mt-4">Управление ссылками в секции FAQ</p>
          </Link>

          {/* Презентация */}
          <Link
            to="/admin/presentation"
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
          >
            <h3 className="text-gray-500 text-sm mb-2">Презентация</h3>
            <p className="text-sm text-gray-600 mt-4">Управление презентацией кресел PDF</p>
          </Link>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminDashboard

