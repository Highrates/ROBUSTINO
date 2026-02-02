import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '@components/admin/AdminLayout'
import ImageUpload from '@components/admin/ImageUpload'
import RichTextEditor from '@components/admin/RichTextEditor'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import useArticlesStore from '@store/articlesStore'

const AdminArticleForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const { currentArticle, fetchArticle, addArticle, editArticle, loading, fetchArticles } = useArticlesStore()

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    content: '',
    cover_image: null,
    article_date: null,
    status: 'draft',
  })

  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Загружаем статью для редактирования
  useEffect(() => {
    let cancelled = false
    
    if (isEdit && id) {
      // Очищаем форму перед загрузкой новой статьи
      setFormData({
        title: '',
        subtitle: '',
        content: '',
        cover_image: null,
        article_date: null,
        status: 'draft',
      })
      
      fetchArticle(id).then(() => {
        // Store сам обрабатывает отмену через fetchAbortFlag
      }).catch((error) => {
        if (!cancelled) {
          console.error('Ошибка загрузки статьи:', error)
        }
      })
    }
    
    // Cleanup: отменяем обновление состояния при размонтировании
    return () => {
      cancelled = true
    }
  }, [isEdit, id, fetchArticle])

  // Заполняем форму данными статьи при редактировании
  useEffect(() => {
    if (isEdit && currentArticle && currentArticle.id === id) {
      console.log('Заполнение формы данными статьи:', currentArticle)
      console.log('Title:', currentArticle.title)
      console.log('Subtitle:', currentArticle.subtitle)
      console.log('Cover image:', currentArticle.cover_image)
      
      setFormData({
        title: currentArticle.title || '',
        subtitle: currentArticle.subtitle || '',
        content: currentArticle.content || '',
        cover_image: currentArticle.cover_image || null,
        article_date: currentArticle.article_date
          ? new Date(currentArticle.article_date)
          : null,
        status: currentArticle.status || 'draft',
      })
    }
  }, [isEdit, currentArticle, id])

  const validate = () => {
    const newErrors = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Заголовок статьи обязателен'
    }

    if (!formData.content.trim() || formData.content === '<p><br></p>') {
      newErrors.content = 'Текст статьи обязателен'
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
      const articleData = {
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim() || null,
        content: formData.content,
        cover_image: formData.cover_image || null,
        article_date: formData.article_date ? formData.article_date.toISOString().split('T')[0] : null,
        status: formData.status,
      }

      // Генерируем slug только при создании новой статьи
      if (!isEdit) {
        const baseSlug = formData.title
          .toLowerCase()
          .replace(/[^a-z0-9а-я]+/g, '-')
          .replace(/(^-|-$)/g, '')
        // Добавляем timestamp только при создании для уникальности
        articleData.slug = `${baseSlug}-${Date.now()}`
      }
      // При редактировании slug не меняем - он уже есть в currentArticle

      console.log('Отправка данных статьи:', articleData)

      if (isEdit) {
        const updated = await editArticle(id, articleData)
        console.log('Статья обновлена:', updated)
      } else {
        const created = await addArticle(articleData)
        console.log('Статья создана:', created)
      }

      console.log('Статья успешно сохранена, обновление списка и переход')
      await fetchArticles()
      navigate('/admin/articles')
    } catch (error) {
      console.error('Ошибка сохранения статьи:', error)

      let errorMessage = 'Ошибка сохранения статьи'

      if (error.message) {
        if (error.message.includes('duplicate key') || error.message.includes('unique')) {
          errorMessage = 'Статья с таким заголовком уже существует. Измените заголовок.'
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

  if (isEdit && loading && !currentArticle) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка статьи...</p>
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
            {isEdit ? 'Редактировать статью' : 'Создать статью'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Заголовок статьи */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Заголовок статьи <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
          </div>

          {/* Подзаголовок статьи */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Подзаголовок статьи
            </label>
            <input
              type="text"
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Краткое описание статьи"
            />
          </div>

          {/* Изображение обложки */}
          <div>
            <ImageUpload
              bucket="articles"
              value={formData.cover_image ? [formData.cover_image] : []}
              onChange={(images) => setFormData({ ...formData, cover_image: images[0] || null })}
              label="Изображение обложки"
              maxFiles={1}
            />
          </div>

          {/* Текст статьи (Rich Text Editor) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Текст статьи <span className="text-red-500">*</span>
            </label>
            <RichTextEditor
              value={formData.content}
              onChange={(content) => setFormData({ ...formData, content })}
              placeholder="Введите текст статьи..."
              pathPrefix="articles"
            />
            {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content}</p>}
          </div>

          {/* Дата статьи */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Дата статьи
            </label>
            <DatePicker
              selected={formData.article_date}
              onChange={(date) => setFormData({ ...formData, article_date: date })}
              dateFormat="dd.MM.yyyy"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholderText="Выберите дату"
              isClearable
            />
          </div>

          {/* Статус публикации */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Статус публикации
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="published"
                  checked={formData.status === 'published'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="mr-2"
                />
                <span>Опубликовать</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="draft"
                  checked={formData.status === 'draft'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="mr-2"
                />
                <span>Черновик</span>
              </label>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/admin/articles')}
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
              {submitting ? 'Сохранение...' : isEdit ? 'Сохранить изменения' : 'Создать статью'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}

export default AdminArticleForm

