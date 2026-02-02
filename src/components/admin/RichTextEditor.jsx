import { useRef, useState, useCallback } from 'react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import ImageCropModal from '@components/admin/ImageCropModal'
import { uploadFile } from '@utils/api'
import { BUCKETS } from '@/config/supabase'

const RichTextEditor = ({
  value,
  onChange,
  placeholder = 'Введите текст статьи...',
  pathPrefix = 'editor'
}) => {
  const quillRef = useRef(null)
  const fileInputRef = useRef(null)
  const [cropModalState, setCropModalState] = useState({ open: false, imageSrc: null })
  const [uploading, setUploading] = useState(false)

  const insertImage = useCallback(
    async (blob) => {
      const quill = quillRef.current?.getEditor?.()
      if (!quill) return

      const range = quill.getSelection(true) ?? { index: quill.getLength(), length: 0 }
      const file = new File([blob], `image-${Date.now()}.jpg`, { type: 'image/jpeg' })
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const filePath = `${pathPrefix}/${fileName}`

      try {
        setUploading(true)
        const { publicUrl } = await uploadFile(file, BUCKETS.IMAGES, filePath)
        quill.insertEmbed(range.index, 'image', publicUrl)
        quill.setSelection(range.index + 1)
        setCropModalState({ open: false, imageSrc: null })
      } catch (err) {
        console.error('Ошибка загрузки изображения:', err)
        alert(err.message || 'Ошибка загрузки изображения')
      } finally {
        setUploading(false)
      }
    },
    [pathPrefix]
  )

  const imageHandler = useCallback(() => {
    const input = fileInputRef.current
    if (!input) return
    input.value = ''
    input.click()
  }, [])

  const handleFileSelect = useCallback(
    (e) => {
      const file = e.target.files?.[0]
      if (!file || !file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = () => {
        setCropModalState({ open: true, imageSrc: reader.result })
      }
      reader.readAsDataURL(file)
    },
    []
  )

  const modules = {
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ indent: '-1' }, { indent: '+1' }],
        ['link', 'image'],
        [{ align: [] }],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    }
  }

  const formats = [
    'header',
    'bold',
    'italic',
    'underline',
    'strike',
    'list',
    'bullet',
    'indent',
    'link',
    'image',
    'align'
  ]

  return (
    <div className="rich-text-editor">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        style={{ minHeight: '300px' }}
      />
      {cropModalState.open && cropModalState.imageSrc && (
        <ImageCropModal
          imageSrc={cropModalState.imageSrc}
          onConfirm={insertImage}
          onCancel={() => !uploading && setCropModalState({ open: false, imageSrc: null })}
          uploading={uploading}
        />
      )}
    </div>
  )
}

export default RichTextEditor
