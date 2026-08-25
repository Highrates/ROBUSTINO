import { Router } from 'express'
import {
  validateAdmin,
  signToken,
  requireAuth,
  setSessionCookie,
  clearSessionCookie,
} from '../auth.js'
import { fail } from '../errors.js'

const router = Router()

/** Simple in-memory rate limit for login (per IP). */
const loginAttempts = new Map()
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX_ATTEMPTS = 10

function getClientIp(req) {
  const xf = req.headers['x-forwarded-for']
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}

function checkLoginRateLimit(ip) {
  const now = Date.now()
  let entry = loginAttempts.get(ip)
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + LOGIN_WINDOW_MS }
    loginAttempts.set(ip, entry)
  }
  entry.count += 1
  if (entry.count > LOGIN_MAX_ATTEMPTS) {
    const retrySec = Math.ceil((entry.resetAt - now) / 1000)
    throw Object.assign(
      new Error(`Слишком много попыток входа. Повторите через ${retrySec} с.`),
      { status: 429 }
    )
  }
}

router.post('/login', async (req, res) => {
  try {
    checkLoginRateLimit(getClientIp(req))
    const { email, password } = req.body || {}
    const user = await validateAdmin(email, password)
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' })
    }
    const token = signToken(user)
    setSessionCookie(res, token)
    // token still returned for debugging / non-browser clients; browser uses httpOnly cookie
    res.json({
      user: { id: user.id, email: user.email, role: user.role },
      session: { user },
    })
  } catch (e) {
    fail(res, e)
  }
})

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

router.post('/logout', (_req, res) => {
  clearSessionCookie(res)
  res.json({ ok: true })
})

export default router
