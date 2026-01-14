import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '@components/admin/AdminLayout'
import useCollectionsStore from '@store/collectionsStore'

const AdminCollectionForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const { currentCollection, fetchCollection, addCollection, updateCollection, loading } = useCollectionsStore()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    display_order: 0,
  })

  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Загружаем коллекцию для редактирования
  useEffect(() => {
    let cancelled = false
    
    if (isEdit && id) {
      fetchCollection(id).then(() => {
        // Store сам обрабатывает отмену через fetchAbortFlag
      }).catch((error) => {
        if (!cancelled) {
          console.error('Ошибка загрузки коллекции:', error)
        }
      })
    }
    
    // Cleanup: отменяем обновление состояния при размонтировании
    return () => {
      cancelled = true
    }
  }, [isEdit, id, fetchCollection])

  // Заполняем форму данными коллекции при редактировании
  useEffect(() => {
    let cancelled = false

    if (isEdit && currentCollection) {
      setFormData({
        name: currentCollection.name || '',
        description: currentCollection.description || '',
        display_order: currentCollection.display_order || 0,
      })
    }

    // Cleanup: отменяем обновление состояния при размонтировании
    return () => {
      cancelled = true
    }
  }, [isEdit, currentCollection])

  const validate = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Название обязательно'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setSubmitting(true)

    try {
      const collectionData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        display_order: formData.display_order || 0,
      }

      if (isEdit) {
        await updateCollection(id, collectionData)
      } else {
        await addCollection(collectionData)
      }

      navigate('/admin/collections')
    } catch (error) {
      console.error('Ошибка сохранения коллекции:', error)

      let errorMessage = 'Ошибка сохранения коллекции'

      if (error.message) {
        if (error.message.includes('null value') || error.message.includes('NOT NULL')) {
          errorMessage = 'Заполните все обязательные поля'
        } else if (error.message.includes('unique') || error.message.includes('duplicate')) {
          errorMessage = 'Коллекция с таким названием уже существует'
        } else if (error.message.includes('row-level security') || error.message.includes('RLS')) {
          errorMessage = 'Ошибка доступа. Проверьте, что вы авторизованы.'
        } else {
          errorMessage = error.message
        }
      }

      alert(errorMessage)
      setSubmitting(false)
    }
  }

  if (isEdit && loading && !currentCollection) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка коллекции...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {isEdit ? 'Редактировать коллекцию' : 'Создать коллекцию'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Название */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Введите название коллекции"
              required
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Описание */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Введите описание коллекции (опционально)"
            />
            <p className="mt-1 text-xs text-gray-500">Опциональное поле</p>
          </div>

          {/* Порядок отображения */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Порядок отображения
            </label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="0"
              min="0"
            />
            <p className="mt-1 text-xs text-gray-500">Чем меньше число, тем выше в списке</p>
          </div>

          {/* Кнопки действий */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/admin/collections')}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              disabled={submitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Сохранение...' : isEdit ? 'Сохранить изменения' : 'Создать коллекцию'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}

export default AdminCollectionForm
