/** Public site origin (browser). Override with VITE_SITE_URL if needed. */
export const SITE_URL = (
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_SITE_URL
    ? String(import.meta.env.VITE_SITE_URL)
    : 'https://robustino.ru'
).replace(/\/$/, '')

export const DEFAULT_TITLE = 'ROBUSTINO — кресла для актовых и зрительных залов'
export const DEFAULT_DESCRIPTION =
  'Производитель кресел ROBUSTINO: кресла для актовых, зрительных и конференц-залов. Каталог моделей, проекты и обивка.'

export const DEFAULT_OG_IMAGE = '/hero-Archi.png'
export const ORGANIZATION_LOGO = '/logo-org.png'

/** Keep in sync with server/src/seo/config.js formatPageTitle */
export function formatPageTitle(title) {
  const t = String(title || '').trim()
  if (!t) return DEFAULT_TITLE
  if (/ROBUSTINO/i.test(t)) return t
  return `${t} — ROBUSTINO`
}

/** Truncate plain text for meta description (~160 chars). */
export function truncateMeta(text, max = 160) {
  const plain = String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (plain.length <= max) return plain
  return `${plain.slice(0, max - 1).trim()}…`
}

export function absoluteUrl(pathOrUrl) {
  if (!pathOrUrl) return SITE_URL
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${SITE_URL}${path}`
}

export function productSeo(product) {
  if (!product) {
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      path: '/products',
      image: DEFAULT_OG_IMAGE,
    }
  }
  const title = formatPageTitle(
    product.seo_title?.trim() || `${product.name} — кресло ROBUSTINO`
  )
  const description =
    product.seo_description?.trim() ||
    truncateMeta(product.description) ||
    DEFAULT_DESCRIPTION
  const image =
    (Array.isArray(product.images) && product.images[0]) || DEFAULT_OG_IMAGE
  return {
    title,
    description,
    path: `/product/${product.slug}`,
    image,
    type: 'product',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: truncateMeta(product.description || description, 500),
      image: [absoluteUrl(image)],
      brand: { '@type': 'Brand', name: 'ROBUSTINO' },
      sku: product.slug,
      url: absoluteUrl(`/product/${product.slug}`),
    },
  }
}

export function articleSeo(article) {
  if (!article) {
    return {
      title: formatPageTitle('Статьи'),
      description: DEFAULT_DESCRIPTION,
      path: '/articles',
      image: DEFAULT_OG_IMAGE,
    }
  }
  const title = formatPageTitle(
    article.seo_title?.trim() || `${article.title} — ROBUSTINO`
  )
  const description =
    article.seo_description?.trim() ||
    truncateMeta(article.excerpt || article.subtitle || article.content) ||
    DEFAULT_DESCRIPTION
  const image = article.cover_image || DEFAULT_OG_IMAGE
  return {
    title,
    description,
    path: `/article/${article.slug}`,
    image,
    type: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description,
      image: absoluteUrl(image),
      datePublished: article.published_at || article.article_date || undefined,
      author: { '@type': 'Organization', name: 'ROBUSTINO' },
      publisher: {
        '@type': 'Organization',
        name: 'ROBUSTINO',
        logo: {
          '@type': 'ImageObject',
          url: absoluteUrl(ORGANIZATION_LOGO),
        },
      },
      url: absoluteUrl(`/article/${article.slug}`),
    },
  }
}

export function pageSeo(link) {
  const name = link?.name || 'Страница'
  const description = truncateMeta(link?.rich_text || link?.page_content) || DEFAULT_DESCRIPTION
  return {
    title: formatPageTitle(name),
    description,
    path: link?.id ? `/page/${link.id}` : '/',
    image: DEFAULT_OG_IMAGE,
    type: 'website',
  }
}

export const STATIC_PAGES = {
  home: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    path: '/',
    image: DEFAULT_OG_IMAGE,
    type: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          name: 'ROBUSTINO',
          url: SITE_URL,
          logo: {
            '@type': 'ImageObject',
            url: absoluteUrl(ORGANIZATION_LOGO),
            width: 512,
            height: 512,
          },
        },
        {
          '@type': 'WebSite',
          name: 'ROBUSTINO',
          url: SITE_URL,
          description: DEFAULT_DESCRIPTION,
        },
      ],
    },
  },
  products: {
    title: formatPageTitle('Каталог кресел'),
    description:
      'Каталог кресел ROBUSTINO для актовых, зрительных и конференц-залов. Модели, характеристики и проекты.',
    path: '/products',
    image: DEFAULT_OG_IMAGE,
  },
  about: {
    title: formatPageTitle('О компании'),
    description:
      'ROBUSTINO — производитель надёжных кресел для актовых и зрительных залов. История и подход к производству.',
    path: '/about',
    image: DEFAULT_OG_IMAGE,
  },
  articles: {
    title: formatPageTitle('Статьи'),
    description: 'Статьи и материалы ROBUSTINO о креслах для залов, проектах и обивке.',
    path: '/articles',
    image: DEFAULT_OG_IMAGE,
  },
  projects: {
    title: formatPageTitle('Реализованные объекты'),
    description:
      'Реализованные объекты ROBUSTINO: актовые и зрительные залы, оснащённые нашими креслами.',
    path: '/projects',
    image: DEFAULT_OG_IMAGE,
  },
  upholstery: {
    title: formatPageTitle('Обивка'),
    description: 'Варианты обивки кресел ROBUSTINO: коллекции тканей и цветов.',
    path: '/upholstery',
    image: DEFAULT_OG_IMAGE,
  },
}
