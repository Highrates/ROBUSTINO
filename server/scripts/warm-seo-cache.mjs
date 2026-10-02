#!/usr/bin/env node
/**
 * Warm SEO HTML disk cache for all public URLs.
 * Cron example: 0 3 * * * cd /root/robustino-api && node scripts/warm-seo-cache.mjs
 */
import 'dotenv/config'
import { warmAllSeoCache } from '../src/seo/cache.js'

const result = await warmAllSeoCache()
console.log(
  `[seo-cache] warmed ok=${result.ok} fail=${result.fail} dir=${process.env.SEO_CACHE_DIR || 'default'}`
)
if (result.fail > 0) process.exitCode = 1
