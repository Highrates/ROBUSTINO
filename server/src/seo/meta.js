import {
  SITE_PUBLIC_URL,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  ORGANIZATION_LOGO,
  absoluteUrl,
  truncateMeta,
  formatPageTitle,
  resolveOgImage,
} from './config.js'

function productMeta(product) {
  const title = formatPageTitle(
    product.seo_title?.trim() || `${product.name} — кресло ROBUSTINO`
  )
  const description =
    product.seo_description?.trim() ||
    truncateMeta(product.description) ||
    DEFAULT_DESCRIPTION
  const image =
    Array.isArray(product.images) && product.images[0] ? product.images[0] : null
  const path = `/product/${product.slug}`
  return {
    title,
    description,
    path,
    canonical: absoluteUrl(path),
    image: resolveOgImage(image),
    type: 'product',
    h1: product.name,
    bodyText: truncateMeta(product.description || product.full_description, 800),
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: truncateMeta(product.description || description, 500),
      image: image ? [absoluteUrl(image)] : [absoluteUrl(DEFAULT_OG_IMAGE)],
      brand: { '@type': 'Brand', name: 'ROBUSTINO' },
      sku: product.slug,
      url: absoluteUrl(path),
    },
  }
}

function articleMeta(article) {
  const title = formatPageTitle(
    article.seo_title?.trim() || `${article.title} — ROBUSTINO`
  )
  const description =
    article.seo_description?.trim() ||
    truncateMeta(article.excerpt || article.subtitle || article.content) ||
    DEFAULT_DESCRIPTION
  const path = `/article/${article.slug}`
  return {
    title,
    description,
    path,
    canonical: absoluteUrl(path),
    image: resolveOgImage(article.cover_image),
    type: 'article',
    h1: article.title,
    bodyText: truncateMeta(article.excerpt || article.content, 800),
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description,
      image: absoluteUrl(article.cover_image || DEFAULT_OG_IMAGE),
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
      url: absoluteUrl(path),
    },
  }
}

function faqMeta(link) {
  const path = `/page/${link.id}`
  const description =
    truncateMeta(link.rich_text || link.page_content) || DEFAULT_DESCRIPTION
  return {
    title: formatPageTitle(link.name),
    description,
    path,
    canonical: absoluteUrl(path),
    image: resolveOgImage(null),
    type: 'website',
    h1: link.name,
    bodyText: truncateMeta(link.page_content || link.rich_text, 800),
  }
}

function staticPage(partial) {
  return {
    image: resolveOgImage(null),
    type: 'website',
    ...partial,
    title: formatPageTitle(partial.title),
    canonical: partial.canonical || absoluteUrl(partial.path),
  }
}

const STATIC = {
  '/': staticPage({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    path: '/',
    canonical: SITE_PUBLIC_URL + '/',
    h1: 'ROBUSTINO',
    bodyText: DEFAULT_DESCRIPTION,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          name: 'ROBUSTINO',
          url: SITE_PUBLIC_URL,
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
          url: SITE_PUBLIC_URL,
          description: DEFAULT_DESCRIPTION,
        },
      ],
    },
  }),
  '/products': staticPage({
    title: 'Каталог кресел — ROBUSTINO',
    description:
      'Каталог кресел ROBUSTINO для актовых, зрительных и конференц-залов. Модели, характеристики и проекты.',
    path: '/products',
    h1: 'Каталог кресел',
    bodyText:
      'Каталог кресел ROBUSTINO для актовых, зрительных и конференц-залов.',
  }),
  '/about': staticPage({
    title: 'О компании — ROBUSTINO',
    description:
      'ROBUSTINO — производитель надёжных кресел для актовых и зрительных залов. История и подход к производству.',
    path: '/about',
    h1: 'О компании',
    bodyText:
      'ROBUSTINO — производитель надёжных кресел для актовых и зрительных залов.',
  }),
  '/articles': staticPage({
    title: 'Статьи — ROBUSTINO',
    description: 'Статьи и материалы ROBUSTINO о креслах для залов, проектах и обивке.',
    path: '/articles',
    h1: 'Статьи',
    bodyText: 'Статьи и материалы ROBUSTINO о креслах для залов, проектах и обивке.',
  }),
  '/projects': staticPage({
    title: 'Реализованные объекты — ROBUSTINO',
    description:
      'Реализованные объекты ROBUSTINO: актовые и зрительные залы, оснащённые нашими креслами.',
    path: '/projects',
    h1: 'Реализованные объекты',
    bodyText:
      'Реализованные объекты ROBUSTINO: актовые и зрительные залы, оснащённые нашими креслами.',
  }),
  '/upholstery': staticPage({
    title: 'Обивка — ROBUSTINO',
    description: 'Варианты обивки кресел ROBUSTINO: коллекции тканей и цветов.',
    path: '/upholstery',
    h1: 'Обивка',
    bodyText: 'Варианты обивки кресел ROBUSTINO: коллекции тканей и цветов.',
  }),
}

export { productMeta, articleMeta, faqMeta, STATIC }
