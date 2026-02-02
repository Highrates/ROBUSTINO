import { useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Cropper } from 'react-cropper'
import 'cropperjs/dist/cropper.css'

const ImageCropModal = ({ imageSrc, onConfirm, onCancel, uploading = false }) => {
  const cropperRef = useRef(null)

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [onCancel])

  const handleConfirm = () => {
    if (!cropperRef.current?.cropper) return
    const cropper = cropperRef.current.cropper
    cropper.getCroppedCanvas({ maxWidth: 1920, maxHeight: 1920, imageSmoothingQuality: 'high' }).toBlob(
      (blob) => {
        if (blob) onConfirm(blob)
      },
      'image/jpeg',
      0.9
    )
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/70"
      onClick={onCancel}
    >
      <div
        className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Обрезать изображение</h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Закрыть"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          <div className="h-[400px] bg-gray-100">
            <Cropper
              ref={cropperRef}
              src={imageSrc}
              style={{ height: 400, width: '100%' }}
              aspectRatio={NaN}
              viewMode={1}
              guides={true}
              background={false}
              responsive={true}
              autoCropArea={0.8}
            />
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {uploading ? 'Загрузка...' : 'Вставить'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ImageCropModal
