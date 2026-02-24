import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '@components/admin/AdminLayout'
import useProductsStore from '@store/productsStore'

const AdminProducts = () => {
  const { products, loading, error, fetchProducts, clearError, removeProduct, setProductsOptimistic, rollbackProducts, updateProductsOrder } = useProductsStore()
  const [deletingId, setDeletingId] = useState(null)
  const [draggedId, setDraggedId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [isReordering, setIsReordering] = useState(false)

  // Сбрасываем ошибку store при входе на список (чтобы не показывать старую ошибку «не опубликован»)
  useEffect(() => {
    clearError()
    fetchProducts()
  }, [fetchProducts, clearError])

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Вы уверены, что хотите удалить товар "${name}"?`)) {
      return
    }

    setDeletingId(id)
    
    // Оптимистичное обновление - удаляем из UI сразу
    const previousProducts = products
    const optimisticProducts = products.filter(p => p.id !== id)
    
    // Обновляем store оптимистично через метод store
    setProductsOptimistic(optimisticProducts)
    
    try {
      await removeProduct(id)
      // Store уже обновлен, но перезагружаем для синхронизации
      await fetchProducts()
    } catch (error) {
      console.error('Ошибка удаления товара:', error)
      // Откатываем изменения при ошибке через метод store
      rollbackProducts(previousProducts)
      alert('Ошибка удаления: ' + (error.message || 'Неизвестная ошибка'))
    } finally {
      setDeletingId(null)
    }
  }

  const handleDragStart = (e, productId) => {
    setDraggedId(productId)
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

  const handleDragOver = (e, productId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (productId !== draggedId) {
      setDragOverId(productId)
    }
  }

  const handleDragLeave = () => {
    setDragOverId(null)
  }

  const handleDrop = async (e, targetProductId) => {
    e.preventDefault()
    setDragOverId(null)

    if (!draggedId || draggedId === targetProductId) {
      setDraggedId(null)
      return
    }

    setIsReordering(true)
    const previousProducts = [...products]

    // Находим индексы перетаскиваемого и целевого элементов
    const draggedIndex = products.findIndex(p => p.id === draggedId)
    const targetIndex = products.findIndex(p => p.id === targetProductId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setIsReordering(false)
      return
    }

    // Создаем новый массив с измененным порядком
    const newProducts = [...products]
    const [removed] = newProducts.splice(draggedIndex, 1)
    newProducts.splice(targetIndex, 0, removed)

    // Обновляем оптимистично UI
    setProductsOptimistic(newProducts)

    try {
      // Сохраняем новый порядок на сервере
      await updateProductsOrder(newProducts)
    } catch (error) {
      console.error('Ошибка обновления порядка товаров:', error)
      // Откатываем изменения при ошибке
      rollbackProducts(previousProducts)
      alert('Ошибка обновления порядка: ' + (error.message || 'Неизвестная ошибка'))
    } finally {
      setDraggedId(null)
      setIsReordering(false)
    }
  }

  return (
    <AdminLayout>
      <div className="admin-products">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Управление товарами</h1>
            <p className="text-sm text-gray-500 mt-1">Перетащите товары для изменения порядка отображения</p>
          </div>
          <Link
            to="/admin/products/new"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            + Создать товар
          </Link>
        </div>

        {loading && (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600">Загрузка товаров...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">Ошибка загрузки: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {products.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-600 mb-2">Товары не найдены</p>
                <p className="text-sm text-gray-500">
                  Нажмите "Создать товар" для добавления нового товара
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
                        Название
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Тип
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Статус
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Дата создания
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr 
                        key={product.id} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, product.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, product.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, product.id)}
                        className={`hover:bg-gray-50 transition-colors ${
                          draggedId === product.id ? 'opacity-50' : ''
                        } ${
                          dragOverId === product.id ? 'bg-blue-50 border-t-2 border-b-2 border-blue-400' : ''
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{product.type || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              product.status === 'published'
                                ? 'bg-green-100 text-green-800'
                                : product.status === 'link_only'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {product.status === 'published' 
                              ? 'Опубликован' 
                              : product.status === 'link_only' 
                              ? 'По ссылке' 
                              : 'Черновик'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.created_at
                            ? new Date(product.created_at).toLocaleDateString('ru-RU')
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-4">
                            <Link
                              to={`/admin/products/${product.id}/edit`}
                              className="text-blue-600 hover:text-blue-900"
                              onClick={(e) => isReordering && e.preventDefault()}
                            >
                              Редактировать
                            </Link>
                            <button
                              onClick={() => handleDelete(product.id, product.name)}
                              disabled={deletingId === product.id || isReordering}
                              className={`text-red-600 hover:text-red-900 ${
                                deletingId === product.id || isReordering ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                            >
                              {deletingId === product.id ? 'Удаление...' : 'Удалить'}
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

export default AdminProducts

