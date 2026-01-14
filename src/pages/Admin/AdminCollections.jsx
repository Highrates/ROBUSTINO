import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '@components/admin/AdminLayout'
import useCollectionsStore from '@store/collectionsStore'
import useUpholsteryStore from '@store/upholsteryStore'

const AdminCollections = () => {
  const { collections, loading, error, fetchCollections, removeCollection, setCollectionsOptimistic, rollbackCollections } = useCollectionsStore()
  const { variants, fetchVariants } = useUpholsteryStore()
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    fetchCollections()
    fetchVariants()
  }, [fetchCollections, fetchVariants])

  // Подсчитываем количество вариантов в каждой коллекции
  const getVariantsCount = (collectionId) => {
    if (collectionId === 'no-collection') return 0
    return variants.filter(v => v.collection_id === collectionId).length
  }

  const handleDelete = async (id, name) => {
    const variantsCount = getVariantsCount(id)
    
    if (variantsCount > 0) {
      if (!window.confirm(
        `Коллекция "${name}" содержит ${variantsCount} ${variantsCount === 1 ? 'вариант' : variantsCount < 5 ? 'варианта' : 'вариантов'}. ` +
        `При удалении коллекции варианты останутся, но будут без коллекции. Продолжить?`
      )) {
        return
      }
    } else {
      if (!window.confirm(`Вы уверены, что хотите удалить коллекцию "${name}"?`)) {
        return
      }
    }

    setDeletingId(id)
    
    // Оптимистичное обновление
    const previousCollections = collections
    const optimisticCollections = collections.filter(c => c.id !== id)
    setCollectionsOptimistic(optimisticCollections)
    
    try {
      await removeCollection(id)
      await fetchCollections()
    } catch (error) {
      console.error('Ошибка удаления коллекции:', error)
      // Откатываем изменения при ошибке
      rollbackCollections(previousCollections)
      alert('Ошибка удаления: ' + (error.message || 'Неизвестная ошибка'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <AdminLayout>
      <div className="admin-collections">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Коллекции обивок</h1>
          <Link
            to="/admin/collections/new"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            + Создать коллекцию
          </Link>
        </div>

        {loading && (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600">Загрузка коллекций...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">Ошибка загрузки: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {collections.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-600 mb-2">Коллекции не найдены</p>
                <p className="text-sm text-gray-500">
                  Нажмите "Создать коллекцию" для добавления новой коллекции
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Название
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Описание
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Вариантов
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {collections.map((collection) => {
                      const variantsCount = getVariantsCount(collection.id)
                      return (
                        <tr key={collection.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {collection.name}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">
                              {collection.description || <span className="text-gray-400">—</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {variantsCount}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <Link
                                to={`/admin/collections/${collection.id}/edit`}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Редактировать
                              </Link>
                              <button
                                onClick={() => handleDelete(collection.id, collection.name)}
                                disabled={deletingId === collection.id}
                                className={`text-red-600 hover:text-red-900 ${
                                  deletingId === collection.id ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              >
                                {deletingId === collection.id ? 'Удаление...' : 'Удалить'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="mt-6">
          <Link
            to="/admin/upholstery"
            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
          >
            ← Вернуться к вариантам обивок
          </Link>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminCollections
