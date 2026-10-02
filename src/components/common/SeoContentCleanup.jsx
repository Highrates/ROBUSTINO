import { useEffect } from 'react'

/**
 * Removes server-injected SEO artifacts after React mounts:
 * - #seo-content (avoids duplicate H1)
 * - #seo-json-ld (avoids duplicate JSON-LD when Helmet injects route schema)
 */
export default function SeoContentCleanup() {
  useEffect(() => {
    document.getElementById('seo-content')?.remove()
    document.getElementById('seo-json-ld')?.remove()
  }, [])
  return null
}
