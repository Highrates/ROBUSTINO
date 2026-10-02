import { Router } from 'express'
import { buildSitemapXml } from './sitemap.js'
import { buildYmlFeed } from './feed.js'
import { warmAllSeoCache } from './cache.js'
import { requireAuth } from '../auth.js'
import { fail } from '../errors.js'

const router = Router()

/** Shared handlers — also mounted at /sitemap.xml and /feed.yml from documentRoutes. */
export async function sendSitemap(_req, res) {
  try {
    const xml = await buildSitemapXml()
    res.type('application/xml').send(xml)
  } catch (e) {
    fail(res, e)
  }
}

export async function sendFeed(_req, res) {
  try {
    const yml = await buildYmlFeed()
    res.type('application/xml').send(yml)
  } catch (e) {
    fail(res, e)
  }
}

router.get('/sitemap.xml', sendSitemap)
router.get('/feed.yml', sendFeed)

/** Manual cache warm (admin). Cron can hit warm-seo-cache.mjs instead. */
router.post('/warm-cache', requireAuth, async (_req, res) => {
  try {
    const result = await warmAllSeoCache()
    res.json(result)
  } catch (e) {
    fail(res, e)
  }
})

export default router
