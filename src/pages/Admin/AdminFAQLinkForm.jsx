import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '@components/admin/AdminLayout'
import useFAQLinksStore from '@store/faqLinksStore'
import RichTextEditor from '@components/admin/RichTextEditor'
import FileUpload from '@components/admin/FileUpload'
import { BUCKETS } from '@/config/buckets'
import { slugify } from '@shared/slugify'

const AdminFAQLinkForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const { currentLink, fetchFAQLink, addFAQLink, editFAQLink, loading, fetchFAQLinks } = useFAQLinksStore()

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    document_url: null,
    rich_text: '',
    is_internal_page: false,
    page_content: '',
  })
  const [slugTouched, setSlugTouched] = useState(false)

  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    
    if (isEdit && id) {
      fetchFAQLink(id).then(() => {
      }).catch((error) => {
        if (!cancelled) {
          console.error('Ошибка загрузки ссылки:', error)
        }
      })
    }
    
    return () => {
      cancelled = true
    }
  }, [isEdit, id, fetchFAQLink])

  useEffect(() => {
    if (isEdit && currentLink) {
      setFormData({
        name: currentLink.name || '',
        slug: currentLink.slug || '',
        document_url: currentLink.document_url || null,
        rich_text: currentLink.rich_text || '',
        is_internal_page: currentLink.is_internal_page || false,
        page_content: currentLink.page_content || '',
      })
      setSlugTouched(!!currentLink.slug)
    }
  }, [isEdit, currentLink])

  const validate = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Название обязательно'
    }

    if (formData.is_internal_page && !formData.page_content?.trim()) {
      newErrors.page_content = 'Содержимое страницы обязательно для внутренних страниц'
    }

    if (formData.is_internal_page) {
      const s = slugify(formData.slug || formData.name)
      if (!s) newErrors.slug = 'Slug обязателен для внутренней страницы'
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
      const linkData = {
        name: formData.name.trim(),
        document_url: formData.is_internal_page ? null : (formData.document_url || null),
        rich_text: formData.is_internal_page ? null : (formData.rich_text || null),
        is_internal_page: formData.is_internal_page,
        page_content: formData.is_internal_page ? (formData.page_content || null) : null,
        slug: formData.is_internal_page
          ? slugify(formData.slug || formData.name)
          : null,
      }

      if (isEdit) {
        await editFAQLink(id, linkData)
      } else {
        await addFAQLink(linkData)
      }

      await fetchFAQLinks()
      navigate('/admin/faq-links')
    } catch (error) {
      console.error('Ошибка сохранения ссылки:', error)
      let errorMessage = 'Ошибка сохранения ссылки'
      if (error.message) {
        errorMessage = error.message
      }
      alert(errorMessage)
      setSubmitting(false)
    }
  }

  if (isEdit && loading && !currentLink) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка ссылки...</p>
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
            {isEdit ? 'Редактировать ссылку FAQ' : 'Создать ссылку FAQ'}
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
              onChange={(e) => {
                const name = e.target.value
                setFormData((prev) => ({
                  ...prev,
                  name,
                  slug:
                    prev.is_internal_page && !slugTouched
                      ? slugify(name)
                      : prev.slug,
                }))
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Введите название ссылки"
              required
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Switch для внутренней страницы */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="is_internal_page"
              checked={formData.is_internal_page}
              onChange={(e) => {
                const on = e.target.checked
                setFormData((prev) => ({
                  ...prev,
                  is_internal_page: on,
                  slug: on
                    ? prev.slug || slugify(prev.name)
                    : prev.slug,
                }))
              }}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_internal_page" className="text-sm font-medium text-gray-700">
              Внутренняя страница (создать страницу на сайте)
            </label>
          </div>

          {formData.is_internal_page ? (
            <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL slug <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 whitespace-nowrap">/page/</span>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => {
                    setSlugTouched(true)
                    setFormData({ ...formData, slug: slugify(e.target.value) })
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                    errors.slug ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="garantii-i-dostavka"
                  required
                />
              </div>
              {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug}</p>}
              <p className="mt-1 text-xs text-gray-500">
                Латиница, без пробелов. Старые ссылки с UUID будут редиректить на этот slug.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Содержимое страницы <span className="text-red-500">*</span>
              </label>
              <RichTextEditor
                value={formData.page_content}
                onChange={(value) => setFormData({ ...formData, page_content: value })}
                placeholder="Введите содержимое страницы..."
                pathPrefix="faq-links"
              />
              {errors.page_content && <p className="mt-1 text-sm text-red-600">{errors.page_content}</p>}
            </div>
            </>
          ) : (
            <>
              {/* Документ */}
              <div>
                <FileUpload
                  bucket={BUCKETS.DOCUMENTS}
                  accept=".pdf,.doc,.docx"
                  maxSize={50 * 1024 * 1024} // 50MB
                  value={formData.document_url}
                  onChange={(url) => setFormData({ ...formData, document_url: url })}
                  label="Документ (опционально)"
                  pathPrefix="faq-links"
                />
              </div>

              {/* RichText */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RichText (опционально)
                </label>
                <RichTextEditor
                  value={formData.rich_text}
                  onChange={(value) => setFormData({ ...formData, rich_text: value })}
                  placeholder="Введите текст ссылки..."
                  pathPrefix="faq-links"
                />
              </div>
            </>
          )}

          {/* Кнопки действий */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/admin/faq-links')}
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
              {submitting ? 'Сохранение...' : isEdit ? 'Сохранить изменения' : 'Создать ссылку'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}

export default AdminFAQLinkForm
