import { useCallback, useEffect, useState } from 'react'
import AdminLayout from '@components/admin/AdminLayout'
import ImageUpload from '@components/admin/ImageUpload'
import { apiFetch } from '@/utils/http'
import { BUCKETS } from '@/config/buckets'
import { SITE_CHAT_STAFF_AVATAR_URL } from '@shared/siteChatLimits.js'

const AdminSettings = () => {
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [savedHint, setSavedHint] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch('/settings/admin-avatar')
      setAvatarUrl(data?.avatarUrl || null)
    } catch (e) {
      setError(e.message || 'Не удалось загрузить настройки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const persist = async (nextUrl) => {
    setSaving(true)
    setError(null)
    setSavedHint(null)
    try {
      const data = await apiFetch('/settings/admin-avatar', {
        method: 'PUT',
        body: { avatarUrl: nextUrl },
      })
      setAvatarUrl(data?.avatarUrl || null)
      setSavedHint('Сохранено. Аватар появится в чате у посетителей.')
    } catch (e) {
      setError(e.message || 'Не удалось сохранить')
      throw e
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = async (urls) => {
    const next = urls[0] || null
    try {
      await persist(next)
    } catch {
      /* error already set */
    }
  }

  const previewSrc = avatarUrl || SITE_CHAT_STAFF_AVATAR_URL

  return (
    <AdminLayout>
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Настройки</h1>
        <p className="text-sm text-gray-600 mb-8">
          Аватар администратора показывается в чате сайта рядом с сообщениями ROBUSTINO.
        </p>

        {loading ? (
          <p className="text-sm text-gray-500">Загрузка…</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
            <div className="flex items-center gap-4">
              <img
                src={previewSrc}
                alt=""
                className="w-16 h-16 rounded-full object-cover border border-gray-200 bg-gray-50"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">Превью в чате</p>
                <p className="text-xs text-gray-500 mt-1">
                  {avatarUrl ? 'Свой аватар' : 'По умолчанию — логотип сайта'}
                </p>
              </div>
            </div>

            <ImageUpload
              bucket={BUCKETS.IMAGES}
              value={avatarUrl ? [avatarUrl] : []}
              onChange={(urls) => void handleAvatarChange(urls)}
              label="Аватар для чата"
              maxFiles={1}
              maxSize={2 * 1024 * 1024}
              pathPrefix="admin-avatar"
            />

            {avatarUrl ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleAvatarChange([])}
                className="text-sm text-gray-600 hover:text-gray-900 underline disabled:opacity-50"
              >
                Сбросить на логотип по умолчанию
              </button>
            ) : null}

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {savedHint ? <p className="text-sm text-green-700">{savedHint}</p> : null}
            {saving ? <p className="text-sm text-gray-500">Сохранение…</p> : null}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default AdminSettings
