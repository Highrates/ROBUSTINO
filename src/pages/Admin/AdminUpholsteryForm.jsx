import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '@components/admin/AdminLayout'
import ImageUpload from '@components/admin/ImageUpload'
import useUpholsteryStore from '@store/upholsteryStore'

const AdminUpholsteryForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const { currentVariant, fetchVariant, addVariant, updateVariant, loading, fetchVariants } = useUpholsteryStore()

  const [formData, setFormData] = useState({
    name: '',
    color: '',
    image_url: null,
  })

  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Загружаем вариант для редактирования
  useEffect(() => {
    let cancelled = false
    
    if (isEdit && id) {
      fetchVariant(id).then(() => {
        // Store сам обрабатывает отмену через fetchAbortFlag
      }).catch((error) => {
        if (!cancelled) {
          console.error('Ошибка загрузки варианта обивки:', error)
        }
      })
    }
    
    // Cleanup: отменяем обновление состояния при размонтировании
    return () => {
      cancelled = true
    }
  }, [isEdit, id, fetchVariant])

  // Заполняем форму данными варианта при редактировании
  useEffect(() => {
    let cancelled = false

    if (isEdit && currentVariant) {
      setFormData({
        name: currentVariant.name || '',
        color: currentVariant.color || '',
        image_url: currentVariant.image_url || null,
      })
    }

    // Cleanup: отменяем обновление состояния при размонтировании
    return () => {
      cancelled = true
    }
  }, [isEdit, currentVariant])

  const validate = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Название обязательно'
    }

    if (!formData.image_url) {
      newErrors.image_url = 'Изображение обязательно'
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
      const variantData = {
        name: formData.name.trim(),
        color: formData.color.trim() || null,
        image_url: formData.image_url,
      }

      if (isEdit) {
        await updateVariant(id, variantData)
      } else {
        await addVariant(variantData)
      }

      await fetchVariants()
      navigate('/admin/upholstery')
    } catch (error) {
      console.error('Ошибка сохранения варианта обивки:', error)

      let errorMessage = 'Ошибка сохранения варианта обивки'

      if (error.message) {
        if (error.message.includes('null value') || error.message.includes('NOT NULL')) {
          errorMessage = 'Заполните все обязательные поля'
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

  if (isEdit && loading && !currentVariant) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка варианта обивки...</p>
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
            {isEdit ? 'Редактировать вариант обивки' : 'Создать вариант обивки'}
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
              placeholder="Введите название варианта обивки"
              required
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Цвет */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Цвет
            </label>
            <input
              type="text"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Например: Красный, Синий, Бежевый"
            />
            <p className="mt-1 text-xs text-gray-500">Опциональное поле</p>
          </div>

          {/* Изображение */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Изображение <span className="text-red-500">*</span>
            </label>
            <ImageUpload
              bucket="images"
              pathPrefix="upholstery"
              value={formData.image_url ? [formData.image_url] : []}
              onChange={(images) => setFormData({ ...formData, image_url: images.length > 0 ? images[0] : null })}
              label="Загрузить изображение"
              maxFiles={1}
              required
              error={errors.image_url}
            />
            {errors.image_url && <p className="mt-1 text-sm text-red-600">{errors.image_url}</p>}
            {formData.image_url && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Текущее изображение:</p>
                <div className="inline-block border border-gray-300 rounded-lg overflow-hidden">
                  <img
                    src={formData.image_url}
                    alt={formData.name || 'Предпросмотр'}
                    className="max-w-xs max-h-48 object-cover"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Кнопки действий */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/admin/upholstery')}
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
              {submitting ? 'Сохранение...' : isEdit ? 'Сохранить изменения' : 'Создать вариант'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}

export default AdminUpholsteryForm

