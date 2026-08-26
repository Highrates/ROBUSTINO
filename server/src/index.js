import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { assertAuthConfig } from './auth.js'
import authRoutes from './routes/auth.js'
import productsRoutes from './routes/products.js'
import articlesRoutes from './routes/articles.js'
import projectsRoutes from './routes/projects.js'
import faqRoutes from './routes/faq.js'
import faqLinksRoutes from './routes/faqLinks.js'
import presentationRoutes from './routes/presentation.js'
import upholsteryRoutes from './routes/upholstery.js'
import productProjectsRoutes from './routes/productProjects.js'
import uploadRoutes from './routes/upload.js'
import chatRoutes from './routes/chat.js'
import settingsRoutes from './routes/settings.js'

assertAuthConfig()

const app = express()
const port = Number(process.env.PORT || 4000)
app.set('trust proxy', 1)

const origins = (process.env.CORS_ORIGIN || 'https://robustino.ru')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || origins.includes(origin)) return cb(null, true)
      return cb(null, false)
    },
    credentials: true,
  })
)
app.use(
  express.json({
    limit: '10mb',
    // Allow top-level JSON string (accidental double-stringify from clients)
    strict: false,
  })
)

// If body was a JSON string, parse once more into an object
app.use((req, _res, next) => {
  if (typeof req.body === 'string') {
    const trimmed = req.body.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        req.body = JSON.parse(trimmed)
      } catch {
        /* leave as string — route may handle */
      }
    }
  }
  next()
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'robustino-api' })
})

app.use('/api/auth', authRoutes)
app.use('/api/products', productsRoutes)
app.use('/api/articles', articlesRoutes)
app.use('/api/projects', projectsRoutes)
app.use('/api/faq', faqRoutes)
app.use('/api/faq-links', faqLinksRoutes)
app.use('/api/presentation', presentationRoutes)
app.use('/api/upholstery', upholsteryRoutes)
app.use('/api/product-projects', productProjectsRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/settings', settingsRoutes)

app.use((err, _req, res, _next) => {
  // express.json parse failures
  if (err instanceof SyntaxError && 'body' in err) {
    console.error('[api] bad json body', err.message)
    return res.status(400).json({ error: 'Некорректный JSON в теле запроса' })
  }
  console.error('[api]', err)
  const status = Number(err?.status) || 500
  if (status >= 500) {
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  }
  res.status(status).json({ error: err?.message || 'Ошибка запроса' })
})

app.listen(port, '127.0.0.1', () => {
  console.log(`robustino-api listening on 127.0.0.1:${port}`)
})
