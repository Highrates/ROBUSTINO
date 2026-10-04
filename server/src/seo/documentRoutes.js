import { Router } from 'express'
import express from 'express'
import path from 'path'
import { SPA_DIST } from './config.js'
import { getHtmlForPath } from './cache.js'
import { getActiveFaqPage } from './queries.js'
import { sendSitemap, sendFeed } from './routes.js'
import { fail } from '../errors.js'
import { isUuid } from '../../../shared/slugify.js'

const router = Router()

const HTML_ROUTES = [
  '/',
  '/products',
  '/about',
  '/articles',
  '/projects',
  '/upholstery',
]

function wantsHtml(req) {
  const accept = req.headers.accept || ''
  if (req.path.startsWith('/api') || req.path.startsWith('/media')) return false
  if (/\.[a-z0-9]{2,5}$/i.test(req.path) && !req.path.endsWith('.html')) return false
  return accept.includes('text/html') || accept.includes('*/*') || !accept
}

async function sendSeoHtml(res, urlPath) {
  const html = await getHtmlForPath(urlPath, { useCache: true })
  if (!html) {
    return res
      .status(404)
      .type('html')
      .send('<!doctype html><title>404</title><h1>Не найдено</h1>')
  }
  return res.status(200).type('html').send(html)
}

async function handleDocument(req, res, urlPath) {
  try {
    if (!wantsHtml(req)) return res.status(404).end()
    await sendSeoHtml(res, urlPath)
  } catch (e) {
    fail(res, e)
  }
}

for (const route of HTML_ROUTES) {
  router.get(route, (req, res) => handleDocument(req, res, route))
}

router.get('/product/:slug', (req, res) =>
  handleDocument(req, res, `/product/${req.params.slug}`)
)

router.get('/article/:slug', (req, res) =>
  handleDocument(req, res, `/article/${req.params.slug}`)
)

router.get('/page/:slug', async (req, res) => {
  try {
    if (!wantsHtml(req)) return res.status(404).end()
    const key = decodeURIComponent(req.params.slug)
    const page = await getActiveFaqPage(key)
    if (!page?.slug) {
      return res
        .status(404)
        .type('html')
        .send('<!doctype html><title>404</title><h1>Не найдено</h1>')
    }
    // Legacy /page/:uuid → /page/:slug
    if (isUuid(key) && key !== page.slug) {
      return res.redirect(301, `/page/${encodeURIComponent(page.slug)}`)
    }
    await sendSeoHtml(res, `/page/${page.slug}`)
  } catch (e) {
    fail(res, e)
  }
})

/**
 * Mount static assets from SPA_DIST and SEO document routes.
 * Call after /api routes in index.js.
 */
export function mountSpaAndSeo(app) {
  // Root aliases reuse the same handlers as /api/seo/*
  app.get('/sitemap.xml', sendSitemap)
  app.get('/feed.yml', sendFeed)

  app.use(router)

  if (SPA_DIST) {
    app.use(
      express.static(SPA_DIST, {
        index: false,
        maxAge: '1y',
        setHeaders(res, filePath) {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache')
          }
        },
      })
    )

    app.get('*', (req, res, next) => {
      if (!wantsHtml(req)) return next()
      if (req.path.startsWith('/api')) return next()
      res.sendFile(path.join(SPA_DIST, 'index.html'), (err) => {
        if (err) next(err)
      })
    })
  }
}

export default router
