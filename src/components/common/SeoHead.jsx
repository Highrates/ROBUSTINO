import { Helmet } from 'react-helmet-async'
import {
  absoluteUrl,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  formatPageTitle,
} from '@/utils/seo'

/**
 * Per-route meta for SPA navigations. Server SEO shell covers first paint for bots.
 * Titles must already be brand-consistent via formatPageTitle / *Seo helpers —
 * SeoHead only normalizes as a safety net (same rule as server).
 */
export default function SeoHead({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  /** Absolute or path override for canonical / og:url (e.g. parent product). */
  canonical,
  image,
  type = 'website',
  jsonLd,
  noindex = false,
}) {
  const url = canonical
    ? (/^https?:\/\//i.test(canonical) ? canonical : absoluteUrl(canonical))
    : absoluteUrl(path)
  const fullTitle = formatPageTitle(title)
  const ogImage = absoluteUrl(image || DEFAULT_OG_IMAGE)
  const ogType =
    type === 'product' ? 'product' : type === 'article' ? 'article' : 'website'

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, follow" />}

      <meta property="og:site_name" content="ROBUSTINO" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  )
}
