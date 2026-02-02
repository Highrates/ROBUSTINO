import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '@components/admin/AdminLayout'
import usePresentationStore from '@store/presentationStore'
import FileUpload from '@components/admin/FileUpload'
import { BUCKETS } from '@/config/supabase'

const AdminPresentation = () => {
  const navigate = useNavigate()
  const { presentation, loading, error, fetchPresentation, savePresentation } = usePresentationStore()

  const [formData, setFormData] = useState({
    name: '',
    document_url: null,
  })

  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchPresentation()
  }, [fetchPresentation])

  useEffect(() => {
    if (presentation) {
      setFormData({
        name: presentation.name || '',
        document_url: presentation.document_url || null,
      })
    }
  }, [presentation])

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
      const presentationData = {
        name: formData.name.trim(),
        document_url: formData.document_url || null,
      }

      await savePresentation(presentationData)
      await fetchPresentation()
      alert('Презентация успешно сохранена')
    } catch (error) {
      console.error('Ошибка сохранения презентации:', error)
      let errorMessage = 'Ошибка сохранения презентации'
      if (error.message) {
        errorMessage = error.message
      }
      alert(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !presentation) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка презентации...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Управление презентацией</h1>
          <p className="text-sm text-gray-500 mt-1">Настройте презентацию кресел PDF</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Ошибка: {error}</p>
          </div>
        )}

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
              placeholder="Введите название презентации"
              required
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Документ */}
          <div>
            <FileUpload
              bucket={BUCKETS.DOCUMENTS}
              accept=".pdf"
              maxSize={50 * 1024 * 1024} // 50MB
              value={formData.document_url}
              onChange={(url) => setFormData({ ...formData, document_url: url })}
              label="Документ PDF (опционально)"
              pathPrefix="presentation"
            />
          </div>

          {/* Кнопки действий */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Сохранение...' : 'Сохранить презентацию'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}

export default AdminPresentation
