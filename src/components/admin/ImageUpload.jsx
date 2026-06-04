import { useState, useRef } from 'react'
import { uploadFile, deleteFile } from '@utils/api'
import { BUCKETS } from '@/config/supabase'

const ImageUpload = ({
  bucket = BUCKETS.IMAGES,
  value = [], // Массив URL изображений
  onChange,
  label = 'Изображения',
  maxFiles = null,
  maxSize = 10 * 1024 * 1024, // 10MB по умолчанию
  required = false,
  error = null,
  pathPrefix = null // Префикс пути для организации файлов (если null, будет определен автоматически)
}) => {
  const [uploading, setUploading] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [reorderDragIndex, setReorderDragIndex] = useState(null)
  const [reorderOverIndex, setReorderOverIndex] = useState(null)
  const fileInputRef = useRef(null)
  const [localError, setLocalError] = useState(null)

  const acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

  const handleFiles = async (files) => {
    const fileArray = Array.from(files)
    
    // Проверка максимального количества
    if (maxFiles && value.length + fileArray.length > maxFiles) {
      setLocalError(`Можно загрузить максимум ${maxFiles} изображений`)
      return
    }

    setLocalError(null)
    setUploading(true)

    const uploadedUrls = [...value]

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]
        setUploadingIndex(i)

        // Валидация типа
        if (!acceptedTypes.includes(file.type)) {
          setLocalError(`Файл "${file.name}" имеет неподдерживаемый тип. Разрешены: JPG, PNG, WebP`)
          continue
        }

        // Валидация размера
        if (file.size > maxSize) {
          setLocalError(`Файл "${file.name}" слишком большой. Максимум: ${(maxSize / 1024 / 1024).toFixed(0)}MB`)
          continue
        }

        // Генерируем уникальное имя файла
        const timestamp = Date.now()
        const fileName = `${timestamp}-${i}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        
        // Определяем путь динамически: используем pathPrefix если передан, иначе определяем по bucket
        const dynamicPathPrefix = pathPrefix || (bucket === BUCKETS.IMAGES ? 'images' : 'files')
        const filePath = `${dynamicPathPrefix}/${fileName}`

        // Загружаем файл
        const result = await uploadFile(file, bucket, filePath)
        uploadedUrls.push(result.publicUrl)
      }

      if (onChange) {
        onChange(uploadedUrls)
      }
    } catch (error) {
      console.error('Ошибка загрузки изображений:', error)
      setLocalError(error.message || 'Ошибка загрузки изображений')
    } finally {
      setUploading(false)
      setUploadingIndex(null)
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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
    // Сбрасываем input, чтобы можно было загрузить тот же файл снова
    e.target.value = ''
  }

  const handleRemove = async (index) => {
    if (!window.confirm('Удалить это изображение?')) return

    const imageUrl = value[index]
    try {
      // Извлекаем путь из URL
      const urlParts = imageUrl.split('/')
      const bucketIndex = urlParts.findIndex(part => part === bucket)
      if (bucketIndex !== -1) {
        const filePath = urlParts.slice(bucketIndex + 1).join('/')
        await deleteFile(bucket, filePath)
      }
      
      const newUrls = value.filter((_, i) => i !== index)
      if (onChange) onChange(newUrls)
    } catch (error) {
      console.error('Ошибка удаления изображения:', error)
      setLocalError('Не удалось удалить изображение')
    }
  }

  const handleReorderDragStart = (e, index) => {
    setReorderDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  const handleReorderDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (reorderDragIndex !== null && reorderDragIndex !== index) {
      setReorderOverIndex(index)
    }
  }

  const handleReorderDrop = (e, dropIndex) => {
    e.preventDefault()

    const dragIndex = reorderDragIndex
    if (dragIndex === null || dragIndex === dropIndex) {
      setReorderDragIndex(null)
      setReorderOverIndex(null)
      return
    }

    const newUrls = [...value]
    const [moved] = newUrls.splice(dragIndex, 1)
    newUrls.splice(dropIndex, 0, moved)

    if (onChange) onChange(newUrls)
    setReorderDragIndex(null)
    setReorderOverIndex(null)
  }

  const handleReorderDragEnd = () => {
    setReorderDragIndex(null)
    setReorderOverIndex(null)
  }

  const canAddMore = !maxFiles || value.length < maxFiles

  return (
    <div className="image-upload">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Превью загруженных изображений */}
      {value.length > 0 && (
        <>
          {value.length > 1 && (
            <p className="text-xs text-gray-500 mb-2">
              Перетащите изображения, чтобы изменить порядок
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {value.map((url, index) => (
              <div
                key={`${url}-${index}`}
                draggable
                onDragStart={(e) => handleReorderDragStart(e, index)}
                onDragOver={(e) => handleReorderDragOver(e, index)}
                onDrop={(e) => handleReorderDrop(e, index)}
                onDragEnd={handleReorderDragEnd}
                onDragLeave={() => {
                  if (reorderOverIndex === index) setReorderOverIndex(null)
                }}
                className={`relative group cursor-grab active:cursor-grabbing rounded-lg transition-all ${
                  reorderDragIndex === index ? 'opacity-50 scale-95' : ''
                } ${
                  reorderOverIndex === index ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                }`}
              >
                <img
                  src={url}
                  alt={`Preview ${index + 1}`}
                  draggable={false}
                  className="w-full h-32 object-cover rounded-lg border border-gray-300 pointer-events-none select-none"
                />
                <span className="absolute top-2 left-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded pointer-events-none">
                  {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Удалить"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Зона загрузки */}
      {canAddMore && (
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
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            onChange={handleInputChange}
            className="hidden"
            disabled={uploading}
          />

          {uploading ? (
            <div>
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">
                Загрузка изображения {uploadingIndex !== null ? uploadingIndex + 1 : ''}...
              </p>
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
                Перетащите изображения сюда или нажмите для выбора
              </p>
              <p className="mt-1 text-xs text-gray-500">
                JPG, PNG, WebP (макс. {(maxSize / 1024 / 1024).toFixed(0)}MB)
                {maxFiles && ` • Максимум ${maxFiles} изображений`}
              </p>
            </div>
          )}
        </div>
      )}

      {maxFiles && value.length >= maxFiles && (
        <p className="mt-2 text-sm text-gray-500">
          Достигнут лимит в {maxFiles} изображений
        </p>
      )}

      {(localError || error) && (
        <p className="mt-2 text-sm text-red-600">{localError || error}</p>
      )}
    </div>
  )
}

export default ImageUpload

