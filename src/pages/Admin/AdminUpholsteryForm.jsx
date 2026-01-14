import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '@components/admin/AdminLayout'
import ImageUpload from '@components/admin/ImageUpload'
import useUpholsteryStore from '@store/upholsteryStore'
import useCollectionsStore from '@store/collectionsStore'

const AdminUpholsteryForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const { currentVariant, fetchVariant, addVariant, updateVariant, loading, fetchVariants } = useUpholsteryStore()
  const { collections, fetchCollections, getOrCreateCollectionByName, loading: collectionsLoading } = useCollectionsStore()

  const [formData, setFormData] = useState({
    name: '',
    color: '',
    image_url: null,
    collection_id: null,
    new_collection_name: '', // Для создания новой коллекции
    isCustomColor: false, // Флаг для отображения поля ввода кастомного цвета
  })

  const [useNewCollection, setUseNewCollection] = useState(false)

  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Загружаем коллекции при монтировании
  useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

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
      const collection = currentVariant.upholstery_collections
      const color = currentVariant.color || ''
      // Проверяем, есть ли цвет в стандартном списке
      const standardColors = [
        'Белый', 'Черный', 'Серый', 'Бежевый', 'Коричневый', 'Красный', 'Синий',
        'Зеленый', 'Желтый', 'Оранжевый', 'Фиолетовый', 'Розовый', 'Голубой',
        'Темно-синий', 'Темно-коричневый', 'Светло-серый', 'Темно-серый', 'Кремовый'
      ]
      const isCustomColor = color && !standardColors.includes(color)
      
      setFormData({
        name: currentVariant.name || '',
        color: color,
        image_url: currentVariant.image_url || null,
        collection_id: currentVariant.collection_id || null,
        new_collection_name: '',
        isCustomColor: isCustomColor,
      })
      setUseNewCollection(false)
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
      let collectionId = null

      // Если выбрана новая коллекция, создаем или получаем её
      if (useNewCollection && formData.new_collection_name.trim()) {
        const collection = await getOrCreateCollectionByName(formData.new_collection_name.trim())
        collectionId = collection?.id || null
      } else if (!useNewCollection && formData.collection_id) {
        collectionId = formData.collection_id
      }

      // Нормализуем цвет: убираем пробелы, приводим первую букву к заглавной
      const normalizedColor = formData.color?.trim() 
        ? formData.color.trim().charAt(0).toUpperCase() + formData.color.trim().slice(1).toLowerCase()
        : null

      const variantData = {
        name: formData.name.trim(),
        color: normalizedColor,
        image_url: formData.image_url,
        collection_id: collectionId,
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
            <div className="space-y-2">
              <select
                value={formData.color || ''}
                onChange={(e) => {
                  const selectedColor = e.target.value
                  if (selectedColor === 'custom') {
                    // Если выбрано "Другое", показываем текстовое поле
                    setFormData({ ...formData, color: '', isCustomColor: true })
                  } else {
                    setFormData({ ...formData, color: selectedColor || null, isCustomColor: false })
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Не указан</option>
                <option value="Белый">Белый</option>
                <option value="Черный">Черный</option>
                <option value="Серый">Серый</option>
                <option value="Бежевый">Бежевый</option>
                <option value="Коричневый">Коричневый</option>
                <option value="Красный">Красный</option>
                <option value="Синий">Синий</option>
                <option value="Зеленый">Зеленый</option>
                <option value="Желтый">Желтый</option>
                <option value="Оранжевый">Оранжевый</option>
                <option value="Фиолетовый">Фиолетовый</option>
                <option value="Розовый">Розовый</option>
                <option value="Голубой">Голубой</option>
                <option value="Темно-синий">Темно-синий</option>
                <option value="Темно-коричневый">Темно-коричневый</option>
                <option value="Светло-серый">Светло-серый</option>
                <option value="Темно-серый">Темно-серый</option>
                <option value="Кремовый">Кремовый</option>
                <option value="custom">Другое (указать вручную)</option>
              </select>
              {formData.isCustomColor && (
                <input
                  type="text"
                  value={formData.color || ''}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Введите цвет вручную"
                  autoFocus
                />
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">Опциональное поле. Выберите из списка или укажите свой вариант</p>
          </div>

          {/* Коллекция */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Коллекция
            </label>
            <div className="space-y-3">
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!useNewCollection}
                    onChange={() => {
                      setUseNewCollection(false)
                      setFormData({ ...formData, new_collection_name: '' })
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Выбрать существующую коллекцию</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={useNewCollection}
                    onChange={() => {
                      setUseNewCollection(true)
                      setFormData({ ...formData, collection_id: null })
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Создать новую коллекцию</span>
                </label>
              </div>

              {!useNewCollection ? (
                <select
                  value={formData.collection_id || ''}
                  onChange={(e) => setFormData({ ...formData, collection_id: e.target.value || null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  disabled={collectionsLoading}
                >
                  <option value="">Без коллекции</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div>
                  <input
                    type="text"
                    value={formData.new_collection_name}
                    onChange={(e) => setFormData({ ...formData, new_collection_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Введите название новой коллекции"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Коллекция будет создана автоматически при сохранении варианта
                  </p>
                </div>
              )}
            </div>
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

