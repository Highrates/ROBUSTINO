import { useRef } from 'react'
import ReactQuill, { Quill } from 'react-quill'
import QuillResize from 'quill-resize-module/dist/resize.js'
import 'react-quill/dist/quill.snow.css'
import 'quill-resize-module/dist/resize.css'

// Регистрируем модуль изменения размера изображений (используем Quill из react-quill)
Quill.register('modules/resize', QuillResize)

const RichTextEditor = ({ value, onChange, placeholder = 'Введите текст статьи...' }) => {
  const quillRef = useRef(null)

  const modules = {
    resize: {
      modules: ['Resize', 'DisplaySize'],
      parchment: {
        image: {
          attribute: ['width', 'height'],
          limit: {
            minWidth: 100,
            maxWidth: 800,
            minHeight: 100,
            maxHeight: 600,
          },
        },
      },
    },
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      ['link', 'image'],
      [{ align: [] }],
      ['clean'],
    ],
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
    'align',
  ]

  return (
    <div className="rich-text-editor">
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
    </div>
  )
}

export default RichTextEditor

