import { useEffect } from 'react'
import usePresentationStore from '@store/presentationStore'

const Footer = () => {
  const { presentation, fetchPresentation } = usePresentationStore()

  useEffect(() => {
    fetchPresentation()
  }, [fetchPresentation])

  return (
    <footer>
      <div className="padding-global">
        <div className="container-large">
          <div className="footer-wrap">
            {presentation && presentation.document_url && (
              <a
                href={presentation.document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                <span className="footer-link-bracket">[ </span>
                <span className="footer-link-text">Презентация PDF</span>
                <span className="footer-link-bracket"> ]</span>
              </a>
            )}

            <span className="footer-brand">@Robustino</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
