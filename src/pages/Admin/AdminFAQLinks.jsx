import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '@components/admin/AdminLayout'
import useFAQLinksStore from '@store/faqLinksStore'

const AdminFAQLinks = () => {
  const { links, loading, error, fetchFAQLinks, removeFAQLink, setLinksOptimistic, rollbackLinks, updateLinksOrder } = useFAQLinksStore()
  const [deletingId, setDeletingId] = useState(null)
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [isReordering, setIsReordering] = useState(false)

  useEffect(() => {
    fetchFAQLinks()
  }, [fetchFAQLinks])

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Вы уверены, что хотите удалить ссылку "${name}"?`)) {
      return
    }

    setDeletingId(id)
    
    const previousLinks = links
    const optimisticLinks = links.filter(l => l.id !== id)
    setLinksOptimistic(optimisticLinks)
    
    try {
      await removeFAQLink(id)
      await fetchFAQLinks()
    } catch (error) {
      console.error('Ошибка удаления ссылки:', error)
      rollbackLinks(previousLinks)
      alert('Ошибка удаления: ' + (error.message || 'Неизвестная ошибка'))
    } finally {
      setDeletingId(null)
    }
  }

  const handleDragStart = (e, linkId) => {
    setDraggedId(linkId)
    e.dataTransfer.effectAllowed = 'move'
    e.target.style.opacity = '0.5'
  }

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1'
    setDraggedId(null)
    setDragOverId(null)
  }

  const handleDragOver = (e, linkId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (linkId !== draggedId) {
      setDragOverId(linkId)
    }
  }

  const handleDragLeave = () => {
    setDragOverId(null)
  }

  const handleDrop = async (e, targetLinkId) => {
    e.preventDefault()
    setDragOverId(null)

    if (!draggedId || draggedId === targetLinkId) {
      setDraggedId(null)
      return
    }

    setIsReordering(true)
    const previousLinks = [...links]

    const draggedIndex = links.findIndex(l => l.id === draggedId)
    const targetIndex = links.findIndex(l => l.id === targetLinkId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setIsReordering(false)
      return
    }

    const newLinks = [...links]
    const [removed] = newLinks.splice(draggedIndex, 1)
    newLinks.splice(targetIndex, 0, removed)

    setLinksOptimistic(newLinks)

    try {
      await updateLinksOrder(newLinks)
    } catch (error) {
      console.error('Ошибка обновления порядка ссылок:', error)
      rollbackLinks(previousLinks)
      alert('Ошибка обновления порядка: ' + (error.message || 'Неизвестная ошибка'))
    } finally {
      setDraggedId(null)
      setIsReordering(false)
    }
  }

  return (
    <AdminLayout>
      <div className="admin-faq-links">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Управление ссылками FAQ</h1>
            <p className="text-sm text-gray-500 mt-1">Перетащите ссылки для изменения порядка отображения</p>
          </div>
          <Link
            to="/admin/faq-links/new"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            + Создать ссылку
          </Link>
        </div>

        {loading && (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600">Загрузка ссылок...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">Ошибка загрузки: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {links.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-600 mb-2">Ссылки не найдены</p>
                <p className="text-sm text-gray-500">
                  Нажмите "Создать ссылку" для добавления новой ссылки
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
                <div className="divide-y divide-gray-200">
                  {links.map((link) => (
                    <div 
                      key={link.id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, link.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, link.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, link.id)}
                      className={`p-6 hover:bg-gray-50 transition-colors ${
                        draggedId === link.id ? 'opacity-50' : ''
                      } ${
                        dragOverId === link.id ? 'bg-blue-50 border-t-2 border-b-2 border-blue-400' : ''
                      } ${isReordering ? 'cursor-wait' : 'cursor-move'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 flex items-start gap-4">
                          <div className="flex items-center justify-center text-gray-400 hover:text-gray-600 mt-1">
                            <svg 
                              className="w-5 h-5" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M4 8h16M4 16h16" 
                              />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {link.name}
                            </h3>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {link.is_internal_page && (
                                <span className="inline-block px-2 py-1 text-xs bg-blue-200 text-blue-700 rounded">Внутренняя страница</span>
                              )}
                              {!link.is_active && (
                                <span className="inline-block px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded">Неактивна</span>
                              )}
                            </div>
                            {link.document_url && !link.is_internal_page && (
                              <p className="text-sm text-gray-600 mb-1">
                                Документ: <a href={link.document_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Открыть</a>
                              </p>
                            )}
                            {link.rich_text && !link.is_internal_page && (
                              <div className="text-sm text-gray-600 mt-1" dangerouslySetInnerHTML={{ __html: link.rich_text.substring(0, 100) + '...' }} />
                            )}
                            {link.is_internal_page && link.page_content && (
                              <p className="text-sm text-gray-500 mt-1">Внутренняя страница с контентом</p>
                            )}
                          </div>
                        </div>
                        <div className="ml-4 flex space-x-2">
                          <Link
                            to={`/admin/faq-links/${link.id}/edit`}
                            className="px-4 py-2 text-blue-600 hover:text-blue-900 text-sm font-medium"
                            onClick={(e) => isReordering && e.preventDefault()}
                          >
                            Редактировать
                          </Link>
                          <button
                            onClick={() => handleDelete(link.id, link.name)}
                            disabled={deletingId === link.id || isReordering}
                            className={`px-4 py-2 text-red-600 hover:text-red-900 text-sm font-medium ${
                              deletingId === link.id || isReordering ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {deletingId === link.id ? 'Удаление...' : 'Удалить'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default AdminFAQLinks
