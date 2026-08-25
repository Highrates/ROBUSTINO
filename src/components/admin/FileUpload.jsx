import { useState, useRef } from 'react'
import { uploadFile, deleteFile } from '@utils/api'
import { BUCKETS } from '@/config/buckets'

const FileUpload = ({ 
  bucket = BUCKETS.MODELS, 
  accept = '.glb',
  maxSize = 50 * 1024 * 1024, // 50MB по умолчанию
  value = null, // URL загруженного файла
  onChange, 
  label = 'Загрузить файл',
  required = false,
  error = null,
  pathPrefix = null // Префикс пути для организации файлов (если null, будет определен автоматически)
}) => {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)
  const [localError, setLocalError] = useState(null)

  const handleFile = async (file) => {
    // Валидация типа файла (поддержка нескольких расширений через запятую, без учёта регистра)
    if (accept) {
      const allowed = accept
        .split(',')
        .map((ext) => ext.trim().toLowerCase().replace(/^\./, ''))
        .filter(Boolean)
      const fileExt = file.name.includes('.')
        ? file.name.split('.').pop().toLowerCase()
        : ''
      if (!allowed.includes(fileExt)) {
        const errorMsg = `Неподдерживаемый тип файла. Разрешены только файлы ${accept}`
        setLocalError(errorMsg)
        if (onChange) onChange(null)
        return
      }
    }

    // Валидация размера
    if (file.size > maxSize) {
      const errorMsg = `Файл слишком большой. Максимальный размер: ${(maxSize / 1024 / 1024).toFixed(0)}MB`
      setLocalError(errorMsg)
      if (onChange) onChange(null)
      return
    }

    setLocalError(null)
    setUploading(true)
    setUploadProgress(0)

    try {
      // Генерируем уникальное имя файла
      const timestamp = Date.now()
      const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}` // Очищаем имя файла
      
      // Определяем путь динамически: используем pathPrefix если передан, иначе определяем по bucket
      const dynamicPathPrefix = pathPrefix || (bucket === BUCKETS.MODELS ? 'models' : bucket === BUCKETS.IMAGES ? 'images' : 'files')
      const filePath = `${dynamicPathPrefix}/${fileName}`

      // Загружаем файл с отслеживанием прогресса
      const result = await uploadFile(file, bucket, filePath, (progress) => {
        setUploadProgress(progress)
      })
      
      // Если был старый файл, удаляем его
      if (value && value !== result.publicUrl) {
        try {
          // Извлекаем путь из URL (последние 2 сегмента после bucket name)
          const urlParts = value.split('/')
          const bucketIndex = urlParts.findIndex(part => part === bucket)
          if (bucketIndex !== -1) {
            const oldPath = urlParts.slice(bucketIndex + 1).join('/')
            await deleteFile(bucket, oldPath)
          }
        } catch (deleteError) {
          console.warn('Не удалось удалить старый файл:', deleteError)
        }
      }

      if (onChange) {
        onChange(result.publicUrl)
      }
    } catch (error) {
      console.error('Ошибка загрузки файла:', error)
      setLocalError(error.message || 'Ошибка загрузки файла')
      if (onChange) onChange(null)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleRemove = async () => {
    if (!value) return

    if (window.confirm('Удалить загруженный файл?')) {
      try {
        // Извлекаем путь из URL
        const urlParts = value.split('/')
        const bucketIndex = urlParts.findIndex(part => part === bucket)
        if (bucketIndex !== -1) {
          const filePath = urlParts.slice(bucketIndex + 1).join('/')
          await deleteFile(bucket, filePath)
        }
        if (onChange) onChange(null)
      } catch (error) {
        console.error('Ошибка удаления файла:', error)
        setLocalError('Не удалось удалить файл')
      }
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="file-upload">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {!value ? (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            className="hidden"
            disabled={uploading}
          />
          
          {uploading ? (
            <div>
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Загрузка... {uploadProgress}%</p>
            </div>
          ) : (
            <div>
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                Перетащите файл сюда или нажмите для выбора
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {accept && `Разрешены файлы: ${accept}`}
                {maxSize && ` (макс. ${(maxSize / 1024 / 1024).toFixed(0)}MB)`}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg
                className="h-8 w-8 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Файл загружен
                </p>
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Открыть файл
                </a>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Удалить
            </button>
          </div>
        </div>
      )}

      {(localError || error) && (
        <p className="mt-2 text-sm text-red-600">{localError || error}</p>
      )}
    </div>
  )
}

export default FileUpload

