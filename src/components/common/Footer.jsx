import { useEffect } from 'react'
import usePresentationStore from '@store/presentationStore'

const Footer = () => {
  const { presentation, fetchPresentation } = usePresentationStore()

  useEffect(() => {
    fetchPresentation() // Загружаем презентацию для footer
  }, [fetchPresentation])

  return (
    <footer>
      <div className="padding-global">
        <div className="container-large">
          <div className="footer-wrap flex flex-row items-center justify-between" style={{ paddingTop: '24px', paddingBottom: '24px', borderTop: '1px solid rgba(0, 0, 0, 0.24)' }}>
            {/* Презентация PDF */}
            {presentation && presentation.document_url && (
              <a 
                href={presentation.document_url} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ fontFamily: 'Commissioner', fontSize: '14px', fontWeight: 450, textTransform: 'uppercase', textDecoration: 'none', color: 'inherit', cursor: 'pointer', transition: 'opacity 0.3s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <span style={{ color: '#363636' }}>[ </span>
                <span style={{ color: '#A9A9A9' }}>Презентация PDF</span>
                <span style={{ color: '#363636' }}> ]</span>
              </a>
            )}

            {/* @Robustino */}
            <span style={{ fontFamily: 'Commissioner', fontSize: '14px', fontWeight: 450, color: '#363636', textTransform: 'uppercase' }}>@Robustino</span>

            {/* Telegram */}
            <a 
              href="https://t.me/robustino" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ fontFamily: 'Commissioner', fontSize: '14px', fontWeight: 450, textTransform: 'uppercase', textDecoration: 'none', color: '#363636', cursor: 'pointer', transition: 'opacity 0.3s ease' }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              TELEGRAM
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

