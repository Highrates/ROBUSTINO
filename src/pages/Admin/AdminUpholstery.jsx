import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '@components/admin/AdminLayout'
import useUpholsteryStore from '@store/upholsteryStore'

const AdminUpholstery = () => {
  const { variants, loading, error, fetchVariants, removeVariant, setVariantsOptimistic, rollbackVariants } = useUpholsteryStore()
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    fetchVariants()
  }, [fetchVariants])

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Вы уверены, что хотите удалить вариант обивки "${name}"?`)) {
      return
    }

    setDeletingId(id)
    
    // Оптимистичное обновление
    const previousVariants = variants
    const optimisticVariants = variants.filter(v => v.id !== id)
    setVariantsOptimistic(optimisticVariants)
    
    try {
      await removeVariant(id)
      await fetchVariants()
    } catch (error) {
      console.error('Ошибка удаления варианта обивки:', error)
      // Откатываем изменения при ошибке
      rollbackVariants(previousVariants)
      alert('Ошибка удаления: ' + (error.message || 'Неизвестная ошибка'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <AdminLayout>
      <div className="admin-upholstery">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Варианты обивок</h1>
          <Link
            to="/admin/upholstery/new"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            + Создать вариант
          </Link>
        </div>

        {loading && (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600">Загрузка вариантов обивок...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">Ошибка загрузки: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {variants.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-600 mb-2">Варианты обивок не найдены</p>
                <p className="text-sm text-gray-500">
                  Нажмите "Создать вариант" для добавления нового варианта обивки
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {variants.map((variant) => (
                  <div key={variant.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    {variant.image_url && (
                      <div className="aspect-video bg-gray-100 overflow-hidden">
                        <img
                          src={variant.image_url}
                          alt={variant.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {variant.name}
                      </h3>
                      {variant.color && (
                        <p className="text-sm text-gray-600 mb-4">
                          Цвет: <span className="font-medium">{variant.color}</span>
                        </p>
                      )}
                      <div className="flex space-x-2">
                        <Link
                          to={`/admin/upholstery/${variant.id}/edit`}
                          className="flex-1 px-4 py-2 text-center text-blue-600 hover:text-blue-900 text-sm font-medium border border-blue-600 rounded-lg hover:bg-blue-50 transition"
                        >
                          Редактировать
                        </Link>
                        <button
                          onClick={() => handleDelete(variant.id, variant.name)}
                          disabled={deletingId === variant.id}
                          className={`flex-1 px-4 py-2 text-red-600 hover:text-red-900 text-sm font-medium border border-red-600 rounded-lg hover:bg-red-50 transition ${
                            deletingId === variant.id ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {deletingId === variant.id ? 'Удаление...' : 'Удалить'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default AdminUpholstery

