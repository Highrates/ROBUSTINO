import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AdminLayout from '@components/admin/AdminLayout'
import useFAQStore from '@store/faqStore'

const AdminFAQForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const { currentFAQ, fetchFAQ, addFAQ, editFAQ, loading, fetchFAQs } = useFAQStore()

  const [formData, setFormData] = useState({
    question: '',
    answer: '',
  })

  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Загружаем FAQ для редактирования
  useEffect(() => {
    let cancelled = false
    
    if (isEdit && id) {
      fetchFAQ(id).then(() => {
        // Store сам обрабатывает отмену через fetchAbortFlag
      }).catch((error) => {
        if (!cancelled) {
          console.error('Ошибка загрузки FAQ:', error)
        }
      })
    }
    
    // Cleanup: отменяем обновление состояния при размонтировании
    return () => {
      cancelled = true
    }
  }, [isEdit, id, fetchFAQ])

  // Заполняем форму данными FAQ при редактировании
  useEffect(() => {
    if (isEdit && currentFAQ) {
      setFormData({
        question: currentFAQ.question || '',
        answer: currentFAQ.answer || '',
      })
    }
  }, [isEdit, currentFAQ])

  const validate = () => {
    const newErrors = {}

    if (!formData.question.trim()) {
      newErrors.question = 'Вопрос обязателен'
    }

    if (!formData.answer.trim()) {
      newErrors.answer = 'Ответ обязателен'
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
      const faqData = {
        question: formData.question.trim(),
        answer: formData.answer.trim(),
      }

      console.log('Отправка данных FAQ:', faqData)

      if (isEdit) {
        const updated = await editFAQ(id, faqData)
        console.log('FAQ обновлен:', updated)
      } else {
        const created = await addFAQ(faqData)
        console.log('FAQ создан:', created)
      }

      console.log('FAQ успешно сохранен, обновление списка и переход')
      await fetchFAQs()
      navigate('/admin/faq')
    } catch (error) {
      console.error('Ошибка сохранения FAQ:', error)

      let errorMessage = 'Ошибка сохранения FAQ'

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

  if (isEdit && loading && !currentFAQ) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка FAQ...</p>
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
            {isEdit ? 'Редактировать FAQ' : 'Создать FAQ'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Вопрос */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Вопрос <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                errors.question ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Введите вопрос"
              required
            />
            {errors.question && <p className="mt-1 text-sm text-red-600">{errors.question}</p>}
          </div>

          {/* Ответ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ответ <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.answer}
              onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
              rows={6}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                errors.answer ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Введите ответ"
              required
            />
            {errors.answer && <p className="mt-1 text-sm text-red-600">{errors.answer}</p>}
          </div>

          {/* Кнопки действий */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/admin/faq')}
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
              {submitting ? 'Сохранение...' : isEdit ? 'Сохранить изменения' : 'Создать FAQ'}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}

export default AdminFAQForm

