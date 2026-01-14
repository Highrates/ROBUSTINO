import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '@components/admin/AdminLayout'
import ImageUpload from '@components/admin/ImageUpload'
import RichTextEditor from '@components/admin/RichTextEditor'
import useProjectsStore from '@store/projectsStore'
import { getProducts } from '@utils/api'

const AdminProjectForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const { currentProject, fetchProject, addProject, editProject, loading, fetchProjects } = useProjectsStore()

  const [formData, setFormData] = useState({
    name: '',
    seats_count: '',
    product_id: '',
    upholstery_variant: '',
    description: '',
    images: [],
  })

  const [availableProducts, setAvailableProducts] = useState([])
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Загружаем товары для выбора
  useEffect(() => {
    let cancelled = false
    
    const loadProducts = async () => {
      try {
        const products = await getProducts()
        // Проверяем, не был ли компонент размонтирован
        if (!cancelled) {
          setAvailableProducts(products)
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Ошибка загрузки товаров:', error)
        }
      }
    }
    loadProducts()
    
    // Cleanup: отменяем обновление состояния при размонтировании
    return () => {
      cancelled = true
    }
  }, [])

  // Загружаем проект для редактирования
  useEffect(() => {
    let cancelled = false
    
    if (isEdit && id) {
      fetchProject(id).then(() => {
        // Store сам обрабатывает отмену через fetchAbortFlag
      }).catch((error) => {
        if (!cancelled) {
          console.error('Ошибка загрузки проекта:', error)
        }
      })
    }
    
    // Cleanup: отменяем обновление состояния при размонтировании
    return () => {
      cancelled = true
    }
  }, [isEdit, id, fetchProject])

  // Заполняем форму данными проекта при редактировании
  useEffect(() => {
    if (isEdit && currentProject) {
      setFormData({
        name: currentProject.name || '',
        seats_count: currentProject.seats_count || '',
        product_id: currentProject.product_id || '',
        upholstery_variant: currentProject.upholstery_variant || '',
        description: currentProject.description || '',
        images: currentProject.images || [],
      })
    }
  }, [isEdit, currentProject])

  const validate = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Название проекта обязательно'
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
      const projectData = {
        name: formData.name.trim(),
        seats_count: formData.seats_count ? parseInt(formData.seats_count) : null,
        product_id: formData.product_id || null,
        upholstery_variant: formData.upholstery_variant.trim() || null,
        description: formData.description || null,
        images: formData.images || [],
      }

      console.log('Отправка данных проекта:', projectData)

      if (isEdit) {
        const updated = await editProject(id, projectData)
        console.log('Проект обновлен:', updated)
      } else {
        const created = await addProject(projectData)
        console.log('Проект создан:', created)
      }

      console.log('Проект успешно сохранен, обновление списка и переход')
      await fetchProjects()
      navigate('/admin/projects')
    } catch (error) {
      console.error('Ошибка сохранения проекта:', error)

      let errorMessage = 'Ошибка сохранения проекта'

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

  if (isEdit && loading && !currentProject) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка проекта...</p>
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
            {isEdit ? 'Редактировать проект' : 'Создать проект'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Название проекта */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название проекта <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Количество мест */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Количество мест
            </label>
            <input
              type="number"
              min="1"
              value={formData.seats_count}
              onChange={(e) => setFormData({ ...formData, seats_count: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Например: 50"
            />
          </div>

          {/* Кресло: выбор из товаров */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Кресло
            </label>
            <select
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Выберите кресло...</option>
              {availableProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} {product.type ? `(${product.type})` : ''}
                </option>
              ))}
            </select>
            {availableProducts.length === 0 && (
              <p className="mt-1 text-sm text-gray-500">
                Сначала создайте товары в разделе "Товары"
              </p>
            )}
          </div>

          {/* Вариант обивки */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Вариант обивки
            </label>
            <input
              type="text"
              value={formData.upholstery_variant}
              onChange={(e) => setFormData({ ...formData, upholstery_variant: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Например: Кожа черная, Ткань серая"
            />
          </div>

          {/* Описание проекта */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание проекта (опционально)
            </label>
            <RichTextEditor
              value={formData.description}
              onChange={(description) => setFormData({ ...formData, description })}
              placeholder="Введите описание проекта..."
            />
          </div>

          {/* Изображения */}
          <div>
            <ImageUpload
              bucket="images"
              pathPrefix="projects"
              value={formData.images}
              onChange={(images) => setFormData({ ...formData, images })}
              label="Изображения проекта"
              maxFiles={10}
            />
          </div>

          {/* Кнопки действий */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/admin/projects')}
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
              {submitting ? 'Сохранение...' : isEdit ? 'Сохранить изменения' : 'Создать проект'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}

export default AdminProjectForm

