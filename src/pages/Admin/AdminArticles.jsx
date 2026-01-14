import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '@components/admin/AdminLayout'
import useArticlesStore from '@store/articlesStore'

const AdminArticles = () => {
  const { articles, loading, error, fetchArticles, removeArticle, setArticlesOptimistic, rollbackArticles, updateArticlesOrder } = useArticlesStore()
  const [deletingId, setDeletingId] = useState(null)
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [isReordering, setIsReordering] = useState(false)

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles])

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Вы уверены, что хотите удалить статью "${title}"?`)) {
      return
    }

    setDeletingId(id)
    
    // Оптимистичное обновление
    const previousArticles = articles
    const optimisticArticles = articles.filter(a => a.id !== id)
    setArticlesOptimistic(optimisticArticles)
    
    try {
      await removeArticle(id)
      await fetchArticles()
    } catch (error) {
      console.error('Ошибка удаления статьи:', error)
      // Откатываем изменения при ошибке через метод store
      rollbackArticles(previousArticles)
      alert('Ошибка удаления: ' + (error.message || 'Неизвестная ошибка'))
    } finally {
      setDeletingId(null)
    }
  }

  const handleDragStart = (e, articleId) => {
    setDraggedId(articleId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', e.target.outerHTML)
    // Делаем элемент полупрозрачным при перетаскивании
    e.target.style.opacity = '0.5'
  }

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1'
    setDraggedId(null)
    setDragOverId(null)
  }

  const handleDragOver = (e, articleId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (articleId !== draggedId) {
      setDragOverId(articleId)
    }
  }

  const handleDragLeave = () => {
    setDragOverId(null)
  }

  const handleDrop = async (e, targetArticleId) => {
    e.preventDefault()
    setDragOverId(null)

    if (!draggedId || draggedId === targetArticleId) {
      setDraggedId(null)
      return
    }

    setIsReordering(true)
    const previousArticles = [...articles]

    // Находим индексы перетаскиваемого и целевого элементов
    const draggedIndex = articles.findIndex(a => a.id === draggedId)
    const targetIndex = articles.findIndex(a => a.id === targetArticleId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setIsReordering(false)
      return
    }

    // Создаем новый массив с измененным порядком
    const newArticles = [...articles]
    const [removed] = newArticles.splice(draggedIndex, 1)
    newArticles.splice(targetIndex, 0, removed)

    // Обновляем оптимистично UI
    setArticlesOptimistic(newArticles)

    try {
      // Сохраняем новый порядок на сервере
      await updateArticlesOrder(newArticles)
    } catch (error) {
      console.error('Ошибка обновления порядка статей:', error)
      // Откатываем изменения при ошибке
      rollbackArticles(previousArticles)
      alert('Ошибка обновления порядка: ' + (error.message || 'Неизвестная ошибка'))
    } finally {
      setDraggedId(null)
      setIsReordering(false)
    }
  }

  return (
    <AdminLayout>
      <div className="admin-articles">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Управление статьями</h1>
            <p className="text-sm text-gray-500 mt-1">Перетащите статьи для изменения порядка отображения</p>
          </div>
          <Link
            to="/admin/articles/new"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            + Создать статью
          </Link>
        </div>

        {loading && (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600">Загрузка статей...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">Ошибка загрузки: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {articles.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-600 mb-2">Статьи не найдены</p>
                <p className="text-sm text-gray-500">
                  Нажмите "Создать статью" для добавления новой статьи
                </p>
              </div>
            ) : (
              <div className="relative">
                {isReordering && (
                  <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">Сохранение порядка...</p>
                    </div>
                  </div>
                )}
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                        {/* Иконка перетаскивания */}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Заголовок
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Подзаголовок
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Дата
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Статус
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {articles.map((article) => (
                      <tr 
                        key={article.id} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, article.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, article.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, article.id)}
                        className={`hover:bg-gray-50 transition-colors ${
                          draggedId === article.id ? 'opacity-50' : ''
                        } ${
                          dragOverId === article.id ? 'bg-blue-50 border-t-2 border-b-2 border-blue-400' : ''
                        } ${isReordering ? 'cursor-wait' : 'cursor-move'}`}
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center text-gray-400 hover:text-gray-600">
                            <svg 
                              className="w-5 h-5" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M4 8h16M4 16h16" 
                              />
                            </svg>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{article.title}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500">
                            {article.subtitle || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {article.article_date
                            ? new Date(article.article_date).toLocaleDateString('ru-RU')
                            : article.created_at
                            ? new Date(article.created_at).toLocaleDateString('ru-RU')
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              article.status === 'published'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {article.status === 'published' ? 'Опубликована' : 'Черновик'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-4">
                            <Link
                              to={`/admin/articles/${article.id}/edit`}
                              className="text-blue-600 hover:text-blue-900"
                              onClick={(e) => isReordering && e.preventDefault()}
                            >
                              Редактировать
                            </Link>
                            <button
                              onClick={() => handleDelete(article.id, article.title)}
                              disabled={deletingId === article.id || isReordering}
                              className={`text-red-600 hover:text-red-900 ${
                                deletingId === article.id || isReordering ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              {deletingId === article.id ? 'Удаление...' : 'Удалить'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default AdminArticles
