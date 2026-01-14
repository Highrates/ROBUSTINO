import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '@components/admin/AdminLayout'
import useFAQStore from '@store/faqStore'

const AdminFAQ = () => {
  const { faqs, loading, error, fetchFAQs, removeFAQ, setFAQsOptimistic, rollbackFAQs, updateFAQsOrder } = useFAQStore()
  const [deletingId, setDeletingId] = useState(null)
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [isReordering, setIsReordering] = useState(false)

  useEffect(() => {
    fetchFAQs()
  }, [fetchFAQs])

  const handleDelete = async (id, question) => {
    if (!window.confirm(`Вы уверены, что хотите удалить вопрос "${question}"?`)) {
      return
    }

    setDeletingId(id)
    
    // Оптимистичное обновление
    const previousFAQs = faqs
    const optimisticFAQs = faqs.filter(f => f.id !== id)
    setFAQsOptimistic(optimisticFAQs)
    
    try {
      await removeFAQ(id)
      await fetchFAQs()
    } catch (error) {
      console.error('Ошибка удаления FAQ:', error)
      // Откатываем изменения при ошибке через метод store
      rollbackFAQs(previousFAQs)
      alert('Ошибка удаления: ' + (error.message || 'Неизвестная ошибка'))
    } finally {
      setDeletingId(null)
    }
  }

  const handleDragStart = (e, faqId) => {
    setDraggedId(faqId)
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

  const handleDragOver = (e, faqId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (faqId !== draggedId) {
      setDragOverId(faqId)
    }
  }

  const handleDragLeave = () => {
    setDragOverId(null)
  }

  const handleDrop = async (e, targetFaqId) => {
    e.preventDefault()
    setDragOverId(null)

    if (!draggedId || draggedId === targetFaqId) {
      setDraggedId(null)
      return
    }

    setIsReordering(true)
    const previousFAQs = [...faqs]

    // Находим индексы перетаскиваемого и целевого элементов
    const draggedIndex = faqs.findIndex(f => f.id === draggedId)
    const targetIndex = faqs.findIndex(f => f.id === targetFaqId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setIsReordering(false)
      return
    }

    // Создаем новый массив с измененным порядком
    const newFAQs = [...faqs]
    const [removed] = newFAQs.splice(draggedIndex, 1)
    newFAQs.splice(targetIndex, 0, removed)

    // Обновляем оптимистично UI
    setFAQsOptimistic(newFAQs)

    try {
      // Сохраняем новый порядок на сервере
      await updateFAQsOrder(newFAQs)
    } catch (error) {
      console.error('Ошибка обновления порядка FAQ:', error)
      // Откатываем изменения при ошибке
      rollbackFAQs(previousFAQs)
      alert('Ошибка обновления порядка: ' + (error.message || 'Неизвестная ошибка'))
    } finally {
      setDraggedId(null)
      setIsReordering(false)
    }
  }

  return (
    <AdminLayout>
      <div className="admin-faq">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Управление FAQ</h1>
            <p className="text-sm text-gray-500 mt-1">Перетащите вопросы для изменения порядка отображения</p>
          </div>
          <Link
            to="/admin/faq/new"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            + Создать FAQ
          </Link>
        </div>

        {loading && (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600">Загрузка FAQ...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">Ошибка загрузки: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {faqs.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-600 mb-2">FAQ не найдены</p>
                <p className="text-sm text-gray-500">
                  Нажмите "Создать FAQ" для добавления нового вопроса-ответа
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
                  {faqs.map((faq) => (
                    <div 
                      key={faq.id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, faq.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, faq.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, faq.id)}
                      className={`p-6 hover:bg-gray-50 transition-colors ${
                        draggedId === faq.id ? 'opacity-50' : ''
                      } ${
                        dragOverId === faq.id ? 'bg-blue-50 border-t-2 border-b-2 border-blue-400' : ''
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
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {faq.question}
                            </h3>
                            <p className="text-gray-600 whitespace-pre-wrap">{faq.answer}</p>
                          </div>
                        </div>
                        <div className="ml-4 flex space-x-2">
                          <Link
                            to={`/admin/faq/${faq.id}/edit`}
                            className="px-4 py-2 text-blue-600 hover:text-blue-900 text-sm font-medium"
                            onClick={(e) => isReordering && e.preventDefault()}
                          >
                            Редактировать
                          </Link>
                          <button
                            onClick={() => handleDelete(faq.id, faq.question)}
                            disabled={deletingId === faq.id || isReordering}
                            className={`px-4 py-2 text-red-600 hover:text-red-900 text-sm font-medium ${
                              deletingId === faq.id || isReordering ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {deletingId === faq.id ? 'Удаление...' : 'Удалить'}
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

export default AdminFAQ
