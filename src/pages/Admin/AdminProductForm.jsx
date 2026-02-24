import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '@components/admin/AdminLayout'
import FileUpload from '@components/admin/FileUpload'
import ImageUpload from '@components/admin/ImageUpload'
import useProductsStore from '@store/productsStore'
import { getProjects, getProductProjects, setProductProjects, getProducts } from '@utils/api'

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
    document_url: null, // Презентация кресла PDF
    images: [],
    status: 'draft',
    private_token: null, // Приватный токен для доступа по ссылке
    parent_product_id: null, // ID основной модели (для конфигураций)
    configurations: [], // Массив ID товаров-конфигураций
    show_only_on_main_model: false, // Только на странице основной модели (не в общем каталоге)
  })
  // Сохраняем токен при смене статуса, чтобы можно было восстановить
  const [savedPrivateToken, setSavedPrivateToken] = useState(null)

  const [selectedProjects, setSelectedProjects] = useState([])
  const [availableProjects, setAvailableProjects] = useState([])
  const [availableProducts, setAvailableProducts] = useState([]) // Все товары для выбора конфигураций
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [projectsDropdownOpen, setProjectsDropdownOpen] = useState(false)
  const [projectsSearch, setProjectsSearch] = useState('')
  const projectsDropdownRef = useRef(null)
  const [configurationsDropdownOpen, setConfigurationsDropdownOpen] = useState(false)
  const [configurationsSearch, setConfigurationsSearch] = useState('')
  const configurationsDropdownRef = useRef(null)

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

  // Загружаем товары для выбора конфигураций
  useEffect(() => {
    let cancelled = false
    
    const loadProducts = async () => {
      try {
        // Используем getProducts напрямую из API для получения всех товаров (включая draft)
        const products = await getProducts()
        // Проверяем, не был ли компонент размонтирован
        if (!cancelled) {
          // Исключаем текущий товар из списка доступных
          const filteredProducts = isEdit && id 
            ? products.filter(p => p.id !== id)
            : products
          setAvailableProducts(filteredProducts)
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
  }, [isEdit, id])

  // Закрытие выпадающего списка при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        projectsDropdownRef.current &&
        !projectsDropdownRef.current.contains(event.target)
      ) {
        setProjectsDropdownOpen(false)
      }
      if (
        configurationsDropdownRef.current &&
        !configurationsDropdownRef.current.contains(event.target)
      ) {
        setConfigurationsDropdownOpen(false)
      }
    }

    if (projectsDropdownOpen || configurationsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [projectsDropdownOpen, configurationsDropdownOpen])

  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        if (projectsDropdownOpen) {
          setProjectsDropdownOpen(false)
        }
        if (configurationsDropdownOpen) {
          setConfigurationsDropdownOpen(false)
        }
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [projectsDropdownOpen, configurationsDropdownOpen])

  // Загружаем товар для редактирования (в т.ч. черновики — forAdmin: true)
  useEffect(() => {
    let cancelled = false
    
    if (isEdit && id) {
      fetchProduct(id, { forAdmin: true }).then(() => {
        // Store сам обрабатывает отмену через fetchAbortFlag
      }).catch((error) => {
        if (!cancelled) {
          console.error('Ошибка загрузки товара:', error)
        }
      })
    }
    
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
        document_url: currentProduct.document_url || null,
        images: currentProduct.images || [],
        status: currentProduct.status || 'draft',
        private_token: currentProduct.private_token || null,
        parent_product_id: currentProduct.parent_product_id || null,
        configurations: [], // Загрузим отдельно
        show_only_on_main_model: currentProduct.show_only_on_main_model ?? false,
      })

      // Загружаем конфигурации (товары, у которых parent_product_id = текущий товар)
      const loadConfigurations = async () => {
        try {
          const { supabase } = await import('@/config/supabase')
          const { data, error } = await supabase
            .from('products')
            .select('id')
            .eq('parent_product_id', currentProduct.id)
          
          if (!error && data) {
            setFormData(prev => ({
              ...prev,
              configurations: data.map(p => p.id)
            }))
          }
        } catch (error) {
          console.error('Ошибка загрузки конфигураций:', error)
        }
      }
      
      loadConfigurations()
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
        document_url: formData.document_url || null,
        parent_product_id: formData.parent_product_id || null,
        images: formData.images || [],
        status: formData.status,
        private_token: finalToken,
        show_only_on_main_model: formData.show_only_on_main_model ?? false,
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

      // Сохраняем конфигурации (обновляем parent_product_id у выбранных товаров)
      if (productId && formData.configurations.length > 0) {
        try {
          const { supabase } = await import('@/config/supabase')
          // Сначала сбрасываем parent_product_id у всех товаров, которые были конфигурациями этого товара
          await supabase
            .from('products')
            .update({ parent_product_id: null })
            .eq('parent_product_id', productId)
          
          // Затем устанавливаем parent_product_id для выбранных конфигураций
          await supabase
            .from('products')
            .update({ parent_product_id: productId })
            .in('id', formData.configurations)
        } catch (error) {
          console.error('Ошибка сохранения конфигураций:', error)
        }
      } else if (productId && formData.configurations.length === 0) {
        // Если конфигураций нет, сбрасываем все связи
        try {
          const { supabase } = await import('@/config/supabase')
          await supabase
            .from('products')
            .update({ parent_product_id: null })
            .eq('parent_product_id', productId)
        } catch (error) {
          console.error('Ошибка сброса конфигураций:', error)
        }
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

  // Обработчики для работы с конфигурациями
  const handleConfigurationToggle = (productId) => {
    setFormData(prev => {
      const isSelected = prev.configurations.includes(productId)
      return {
        ...prev,
        configurations: isSelected
          ? prev.configurations.filter(id => id !== productId)
          : [...prev.configurations, productId]
      }
    })
  }

  const handleConfigurationRemove = (productId) => {
    setFormData(prev => ({
      ...prev,
      configurations: prev.configurations.filter(id => id !== productId)
    }))
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

          {/* 3D модель */}
          <div>
            <FileUpload
              bucket="models"
              pathPrefix="products/models"
              accept=".glb"
              maxSize={50 * 1024 * 1024}
              value={formData.model_url}
              onChange={(url) => setFormData({ ...formData, model_url: url })}
              label="3D модель"
            />
          </div>

          {/* Презентация кресла PDF */}
          <div>
            <FileUpload
              bucket="documents"
              pathPrefix="products/presentations"
              accept=".pdf"
              maxSize={20 * 1024 * 1024}
              value={formData.document_url}
              onChange={(url) => setFormData({ ...formData, document_url: url })}
              label="Презентация кресла PDF"
            />
          </div>

          {/* Основная модель (для конфигураций) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Основная модель (опционально)
            </label>
            <select
              value={formData.parent_product_id || ''}
              onChange={(e) => {
                const newParentId = e.target.value || null
                setFormData({ 
                  ...formData, 
                  parent_product_id: newParentId,
                  // Если выбрана основная модель (стали конфигурацией), очищаем список конфигураций
                  configurations: newParentId ? [] : formData.configurations
                })
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Нет (это основная модель)</option>
              {availableProducts
                .filter(p => {
                  // Исключаем текущий товар
                  if (p.id === id) return false
                  // Показываем только основные модели (у которых parent_product_id = NULL)
                  // Исключаем конфигурации, чтобы избежать многоуровневых конфигураций
                  if (p.parent_product_id) return false
                  return true
                })
                .map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} {product.type ? `(${product.type})` : ''}
                  </option>
                ))}
            </select>
            {availableProducts.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">
                Сначала создайте товары в разделе "Товары"
              </p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              Выберите основную модель, если этот товар является её конфигурацией
            </p>
          </div>

          {/* Конфигурации - показываем только для основных моделей */}
          {!formData.parent_product_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Конфигурации
              </label>
            <div className="relative" ref={configurationsDropdownRef}>
              <button
                type="button"
                onClick={() => setConfigurationsDropdownOpen(!configurationsDropdownOpen)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-left flex items-center justify-between"
              >
                <span className="text-gray-700">
                  {formData.configurations.length > 0
                    ? `Выбрано: ${formData.configurations.length}`
                    : 'Выберите товары-конфигурации'}
                </span>
                <svg
                  className={`w-5 h-5 transition-transform ${configurationsDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {configurationsDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <input
                    type="text"
                    placeholder="Поиск товаров..."
                    value={configurationsSearch}
                    onChange={(e) => setConfigurationsSearch(e.target.value)}
                    className="w-full px-4 py-2 border-b border-gray-200 focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="p-2">
                    {availableProducts.length === 0 ? (
                      <p className="text-sm text-gray-500 p-2">
                        Сначала создайте товары в разделе "Товары"
                      </p>
                    ) : (
                      <>
                        {availableProducts
                          .filter(p => {
                            // Исключаем текущий товар
                            if (p.id === id) return false
                            // Исключаем уже выбранные конфигурации (они показываются отдельно)
                            if (formData.configurations.includes(p.id)) return false
                            // Исключаем товары, которые уже являются конфигурациями других товаров
                            if (p.parent_product_id && p.parent_product_id !== id) return false
                            // Фильтр по поиску
                            if (configurationsSearch) {
                              const search = configurationsSearch.toLowerCase()
                              return p.name.toLowerCase().includes(search) || 
                                     (p.type && p.type.toLowerCase().includes(search))
                            }
                            return true
                          })
                          .map(product => (
                            <label
                              key={product.id}
                              className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={formData.configurations.includes(product.id)}
                                onChange={() => handleConfigurationToggle(product.id)}
                                className="mr-2"
                              />
                              <span className="text-sm text-gray-700">
                                {product.name} {product.type ? `(${product.type})` : ''}
                              </span>
                            </label>
                          ))}
                        {availableProducts.filter(p => {
                          if (p.id === id) return false
                          if (formData.configurations.includes(p.id)) return false
                          if (p.parent_product_id && p.parent_product_id !== id) return false
                          if (configurationsSearch) {
                            const search = configurationsSearch.toLowerCase()
                            return p.name.toLowerCase().includes(search) || 
                                   (p.type && p.type.toLowerCase().includes(search))
                          }
                          return true
                        }).length === 0 && (
                          <p className="text-sm text-gray-500 p-2">Нет доступных товаров</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Список выбранных конфигураций */}
            {formData.configurations.length > 0 && (
              <div className="mt-2 space-y-2">
                {formData.configurations.map(configId => {
                  const config = availableProducts.find(p => p.id === configId)
                  if (!config) return null
                  return (
                    <div
                      key={configId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="text-sm text-gray-700">
                        {config.name} {config.type && `(${config.type})`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleConfigurationRemove(configId)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Удалить
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            </div>
          )}

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

            {/* Переключатель: только на странице основной модели (имеет смысл при статусе «Опубликовано») */}
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={formData.show_only_on_main_model}
                onClick={() => setFormData({ ...formData, show_only_on_main_model: !formData.show_only_on_main_model })}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  formData.show_only_on_main_model ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                    formData.show_only_on_main_model ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                  aria-hidden="true"
                />
              </button>
              <label className="text-sm text-gray-700 cursor-pointer" onClick={() => setFormData({ ...formData, show_only_on_main_model: !formData.show_only_on_main_model })}>
                Товар отображается только на странице основной модели
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {formData.show_only_on_main_model
                ? 'Включено: товар не показывается в общем каталоге, только в блоке конфигураций на странице основной модели.'
                : 'Выключено: при статусе «Опубликовано» товар отображается в каталоге как обычно.'}
            </p>
            
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

