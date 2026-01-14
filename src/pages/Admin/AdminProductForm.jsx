import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '@components/admin/AdminLayout'
import FileUpload from '@components/admin/FileUpload'
import ImageUpload from '@components/admin/ImageUpload'
import useProductsStore from '@store/productsStore'
import { getProjects, getProductProjects, setProductProjects } from '@utils/api'

// Генерация приватного токена для доступа по ссылке
const generatePrivateToken = () => {
  // Генерируем случайный токен из 32 символов (hex)
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// Проверка уникальности токена через API
const checkTokenUniqueness = async (token, currentProductId = null) => {
  try {
    const { supabase } = await import('@/config/supabase')
    if (!supabase) return true // Если Supabase не настроен, считаем токен уникальным
    
    // Проверяем, существует ли товар с таким токеном
    let query = supabase
      .from('products')
      .select('id')
      .eq('private_token', token)
      .limit(1)
    
    // Если редактируем существующий товар, исключаем его из проверки
    if (currentProductId) {
      query = query.neq('id', currentProductId)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.warn('Ошибка проверки уникальности токена:', error)
      return true // В случае ошибки считаем токен уникальным
    }
    
    // Если данных нет, токен уникален
    return !data || data.length === 0
  } catch (error) {
    console.warn('Ошибка при проверке уникальности токена:', error)
    return true // В случае ошибки считаем токен уникальным
  }
}

// Генерация уникального токена с проверкой
const generateUniquePrivateToken = async (currentProductId = null, maxAttempts = 10) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const token = generatePrivateToken()
    const isUnique = await checkTokenUniqueness(token, currentProductId)
    
    if (isUnique) {
      return token
    }
    
    // Если токен не уникален, генерируем новый
    console.warn(`Токен не уникален, попытка ${attempt + 1}/${maxAttempts}`)
  }
  
  // Если не удалось сгенерировать уникальный токен за maxAttempts попыток,
  // добавляем timestamp для гарантированной уникальности
  const baseToken = generatePrivateToken()
  return `${baseToken}-${Date.now()}`
}

const AdminProductForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const { currentProduct, fetchProduct, addProduct, editProduct, loading, fetchProducts } = useProductsStore()

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    delivery_time: '',
    volume_m3: '',
    weight_kg: '',
    in_stock: '',
    model_url: null,
    additional_models: [],
    images: [],
    status: 'draft',
    private_token: null, // Приватный токен для доступа по ссылке
  })
  // Сохраняем токен при смене статуса, чтобы можно было восстановить
  const [savedPrivateToken, setSavedPrivateToken] = useState(null)

  const [selectedProjects, setSelectedProjects] = useState([])
  const [availableProjects, setAvailableProjects] = useState([])
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [projectsDropdownOpen, setProjectsDropdownOpen] = useState(false)
  const [projectsSearch, setProjectsSearch] = useState('')
  const projectsDropdownRef = useRef(null)

  // Загружаем проекты для выбора
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const projects = await getProjects()
        setAvailableProjects(projects)
      } catch (error) {
        console.error('Ошибка загрузки проектов:', error)
      }
    }
    loadProjects()
  }, [])

  // Закрытие выпадающего списка при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        projectsDropdownRef.current &&
        !projectsDropdownRef.current.contains(event.target)
      ) {
        setProjectsDropdownOpen(false)
      }
    }

    if (projectsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [projectsDropdownOpen])

  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && projectsDropdownOpen) {
        setProjectsDropdownOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [projectsDropdownOpen])

  // Загружаем товар для редактирования
  useEffect(() => {
    let cancelled = false
    
    if (isEdit && id) {
      fetchProduct(id).then(() => {
        // Store сам обрабатывает отмену через fetchAbortFlag
      }).catch((error) => {
        if (!cancelled) {
          console.error('Ошибка загрузки товара:', error)
        }
      })
    }
    
    // Cleanup: отменяем обновление состояния при размонтировании
    return () => {
      cancelled = true
    }
  }, [isEdit, id, fetchProduct])

  // Заполняем форму данными товара при редактировании
  useEffect(() => {
    let cancelled = false

    if (isEdit && currentProduct) {
      setFormData({
        name: currentProduct.name || '',
        type: currentProduct.type || '',
        description: currentProduct.description || '',
        delivery_time: currentProduct.delivery_time || '',
        volume_m3: currentProduct.volume_m3 || '',
        weight_kg: currentProduct.weight_kg || '',
        in_stock: currentProduct.in_stock || '',
        model_url: currentProduct.model_url || null,
        additional_models: currentProduct.additional_models || [],
        images: currentProduct.images || [],
        status: currentProduct.status || 'draft',
        private_token: currentProduct.private_token || null,
      })
      // Сохраняем существующий токен при загрузке товара
      if (currentProduct.private_token) {
        setSavedPrivateToken(currentProduct.private_token)
      }

      // Загружаем связанные проекты
      const loadProjects = async () => {
        try {
          const projects = await getProductProjects(currentProduct.id)
          if (!cancelled) {
            setSelectedProjects(projects.map(p => p.id))
          }
        } catch (error) {
          if (!cancelled) {
            console.error('Ошибка загрузки связанных проектов:', error)
          }
        }
      }
      
      loadProjects()
    }

    // Cleanup: отменяем обновление состояния при размонтировании
    // Вынесен на уровень useEffect, а не внутри условия
    return () => {
      cancelled = true
    }
  }, [isEdit, currentProduct])

  const validate = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Название товара обязательно'
    }

    if (!formData.type.trim()) {
      newErrors.type = 'Тип товара обязателен'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Описание товара обязательно'
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
      // Если статус link_only, но токена нет, генерируем уникальный
      let finalToken = null
      if (formData.status === 'link_only') {
        finalToken = formData.private_token || savedPrivateToken
        if (!finalToken) {
          finalToken = await generateUniquePrivateToken(isEdit ? id : null)
        }
      }

      const productData = {
        name: formData.name.trim(),
        type: formData.type.trim(),
        description: formData.description.trim(),
        delivery_time: formData.delivery_time || null,
        volume_m3: formData.volume_m3 ? parseFloat(formData.volume_m3) : null,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
        in_stock: formData.in_stock || null,
        model_url: formData.model_url || null,
        additional_models: formData.additional_models || [],
        images: formData.images || [],
        status: formData.status,
        private_token: finalToken,
      }

      // Генерируем slug только при создании нового товара
      if (!isEdit) {
        const baseSlug = formData.name
          .toLowerCase()
          .replace(/[^a-z0-9а-я]+/g, '-')
          .replace(/(^-|-$)/g, '')
        // Добавляем timestamp только при создании для уникальности
        productData.slug = `${baseSlug}-${Date.now()}`
      }
      // При редактировании slug не меняем - он уже есть в currentProduct

      console.log('Отправка данных товара:', productData)

      let productId
      if (isEdit) {
        const updated = await editProduct(id, productData)
        console.log('Товар обновлен:', updated)
        productId = updated.id
      } else {
        const created = await addProduct(productData)
        console.log('Товар создан:', created)
        productId = created.id
      }

      // Сохраняем связи с проектами
      if (productId && selectedProjects.length > 0) {
        console.log('Сохранение связей с проектами:', selectedProjects)
        await setProductProjects(productId, selectedProjects)
      }

      console.log('Товар успешно сохранен, обновление списка и переход')
      // Обновляем список товаров перед переходом
      await fetchProducts()
      navigate('/admin/products')
    } catch (error) {
      console.error('Ошибка сохранения товара:', error)
      
      // Более информативные сообщения об ошибках
      let errorMessage = 'Ошибка сохранения товара'
      
      if (error.message) {
        if (error.message.includes('duplicate key') || error.message.includes('unique')) {
          errorMessage = 'Товар с таким названием уже существует. Измените название.'
        } else if (error.message.includes('null value') || error.message.includes('NOT NULL')) {
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

  const handleAdditionalModelAdd = (url) => {
    if (formData.additional_models.length < 5) {
      setFormData({
        ...formData,
        additional_models: [...formData.additional_models, url],
      })
    }
  }

  const handleAdditionalModelRemove = (index) => {
    setFormData({
      ...formData,
      additional_models: formData.additional_models.filter((_, i) => i !== index),
    })
  }

  if (isEdit && loading && !currentProduct) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка товара...</p>
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
            {isEdit ? 'Редактировать товар' : 'Создать товар'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Название товара */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название товара <span className="text-red-500">*</span>
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

          {/* Тип товара */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Тип товара <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                errors.type ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Например: Кресло, Стул, Диван"
              required
            />
            {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
          </div>

          {/* Описание товара */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание товара <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
          </div>

          {/* Срок поставки */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Срок поставки
            </label>
            <input
              type="text"
              value={formData.delivery_time}
              onChange={(e) => setFormData({ ...formData, delivery_time: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="от 3 недель"
            />
          </div>

          {/* Объем и Вес в одной строке */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Объем единицы товара в упаковке
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  value={formData.volume_m3}
                  onChange={(e) => setFormData({ ...formData, volume_m3: e.target.value })}
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="0.000"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">м³</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Вес
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight_kg}
                  onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                  className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="0.0"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">кг</span>
              </div>
            </div>
          </div>

          {/* Наличие */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Наличие
            </label>
            <select
              value={formData.in_stock}
              onChange={(e) => setFormData({ ...formData, in_stock: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Выберите...</option>
              <option value="В наличии">В наличии</option>
              <option value="Под заказ">Под заказ</option>
              <option value="Нет в наличии">Нет в наличии</option>
            </select>
          </div>

          {/* Основная 3D модель */}
          <div>
            <FileUpload
              bucket="models"
              pathPrefix="products/models"
              accept=".glb"
              maxSize={50 * 1024 * 1024}
              value={formData.model_url}
              onChange={(url) => setFormData({ ...formData, model_url: url })}
              label="Основная 3D модель"
            />
          </div>

          {/* Еще конфигурации (дополнительные 3D модели) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Еще конфигурации (максимум 5)
            </label>
            {formData.additional_models.map((url, index) => (
              <div key={index} className="mb-2 flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">Модель {index + 1}</span>
                <button
                  type="button"
                  onClick={() => handleAdditionalModelRemove(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Удалить
                </button>
              </div>
            ))}
            {formData.additional_models.length < 5 && (
              <FileUpload
                bucket="models"
                pathPrefix="products/models"
                accept=".glb"
                maxSize={50 * 1024 * 1024}
                value={null}
                onChange={handleAdditionalModelAdd}
                label=""
              />
            )}
            {formData.additional_models.length >= 5 && (
              <p className="text-sm text-gray-500">Достигнут лимит в 5 дополнительных моделей</p>
            )}
          </div>

          {/* Изображения */}
          <div>
            <ImageUpload
              bucket="images"
              pathPrefix="products"
              value={formData.images}
              onChange={(images) => setFormData({ ...formData, images })}
              label="Изображения"
            />
          </div>

          {/* Реализованные объекты */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Реализованные объекты
            </label>
            
            {availableProjects.length === 0 ? (
              <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-500">
                  Проекты не найдены. Сначала создайте проекты в разделе "Проекты".
                </p>
              </div>
            ) : (
              <div className="relative" ref={projectsDropdownRef}>
                {/* Кнопка для открытия/закрытия списка */}
                <button
                  type="button"
                  onClick={() => setProjectsDropdownOpen(!projectsDropdownOpen)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <span className="text-sm text-gray-700">
                    {selectedProjects.length > 0
                      ? `Выбрано проектов: ${selectedProjects.length}`
                      : 'Выберите проекты...'}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      projectsDropdownOpen ? 'transform rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Раскрывающийся список */}
                {projectsDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
                    {/* Поиск */}
                    <div className="p-3 border-b border-gray-200">
                      <input
                        type="text"
                        placeholder="Поиск проектов..."
                        value={projectsSearch}
                        onChange={(e) => setProjectsSearch(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>

                    {/* Список проектов */}
                    <div className="max-h-64 overflow-y-auto">
                      {availableProjects
                        .filter((project) =>
                          project.name.toLowerCase().includes(projectsSearch.toLowerCase()) ||
                          (project.client && project.client.toLowerCase().includes(projectsSearch.toLowerCase()))
                        )
                        .map((project) => {
                          const isSelected = selectedProjects.includes(project.id)
                          return (
                            <label
                              key={project.id}
                              className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedProjects([...selectedProjects, project.id])
                                  } else {
                                    setSelectedProjects(selectedProjects.filter(id => id !== project.id))
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <span className="text-sm text-gray-700 font-medium">
                                  {project.name}
                                </span>
                                {project.client && (
                                  <span className="text-xs text-gray-500 ml-2">
                                    ({project.client})
                                  </span>
                                )}
                              </div>
                            </label>
                          )
                        })}
                      
                      {availableProjects.filter((project) =>
                        project.name.toLowerCase().includes(projectsSearch.toLowerCase()) ||
                        (project.client && project.client.toLowerCase().includes(projectsSearch.toLowerCase()))
                      ).length === 0 && (
                        <div className="p-4 text-center text-sm text-gray-500">
                          Проекты не найдены
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Выбранные проекты (теги) */}
                {selectedProjects.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedProjects.map((projectId) => {
                      const project = availableProjects.find(p => p.id === projectId)
                      if (!project) return null
                      return (
                        <span
                          key={projectId}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {project.name}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProjects(selectedProjects.filter(id => id !== projectId))
                            }}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Статус публикации */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Статус публикации
            </label>
            <div className="flex flex-col space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="published"
                  checked={formData.status === 'published'}
                  onChange={(e) => {
                    // Сохраняем токен перед сменой статуса
                    if (formData.status === 'link_only' && formData.private_token) {
                      setSavedPrivateToken(formData.private_token)
                    }
                    setFormData({ ...formData, status: e.target.value, private_token: null })
                  }}
                  className="mr-2"
                />
                <span>Опубликовано</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="draft"
                  checked={formData.status === 'draft'}
                  onChange={(e) => {
                    // Сохраняем токен перед сменой статуса
                    if (formData.status === 'link_only' && formData.private_token) {
                      setSavedPrivateToken(formData.private_token)
                    }
                    setFormData({ ...formData, status: e.target.value, private_token: null })
                  }}
                  className="mr-2"
                />
                <span>Скрыто</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="link_only"
                  checked={formData.status === 'link_only'}
                  onChange={async (e) => {
                    const newStatus = e.target.value
                    // Восстанавливаем сохраненный токен или генерируем новый уникальный
                    let newToken = formData.private_token || savedPrivateToken
                    if (!newToken) {
                      newToken = await generateUniquePrivateToken(isEdit ? id : null)
                    }
                    setFormData({ ...formData, status: newStatus, private_token: newToken })
                  }}
                  className="mr-2"
                />
                <span>Доступно только по ссылке</span>
              </label>
            </div>
            
            {/* Поле для приватной ссылки */}
            {formData.status === 'link_only' && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Приватная ссылка
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={formData.private_token ? `${window.location.origin}/product/${formData.private_token}` : ''}
                    readOnly
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                    placeholder="Ссылка будет сгенерирована автоматически"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const newToken = await generateUniquePrivateToken(isEdit ? id : null)
                      setFormData({ ...formData, private_token: newToken })
                      setSavedPrivateToken(newToken) // Сохраняем новый токен
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Обновить
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.private_token) {
                        navigator.clipboard.writeText(`${window.location.origin}/product/${formData.private_token}`)
                        alert('Ссылка скопирована в буфер обмена!')
                      }
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
                  >
                    Копировать
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Товар будет доступен только по этой ссылке и не будет отображаться на сайте
                </p>
              </div>
            )}
          </div>

          {/* Кнопки действий */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/admin/products')}
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
              {submitting ? 'Сохранение...' : isEdit ? 'Сохранить изменения' : 'Создать товар'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}

export default AdminProductForm

