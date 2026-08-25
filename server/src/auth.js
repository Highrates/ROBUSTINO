import 'dotenv/config'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@robustino.ru').toLowerCase()
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ''

/** Short-lived session (httpOnly cookie). Override with JWT_EXPIRES e.g. 4h / 12h */
export const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h'
export const COOKIE_NAME = process.env.COOKIE_NAME || 'robustino_session'
/** Cookie max-age seconds — keep in sync with JWT_EXPIRES default 8h */
export const COOKIE_MAX_AGE_SEC = Number(process.env.COOKIE_MAX_AGE_SEC || 8 * 60 * 60)

/** Call once at process start — refuse to boot without secrets */
export function assertAuthConfig() {
  if (!JWT_SECRET || JWT_SECRET === 'dev-secret' || JWT_SECRET.length < 16) {
    throw new Error(
      'JWT_SECRET must be set in environment (min 16 chars). Refusing to start with a weak/default secret.'
    )
  }
  if (!ADMIN_PASSWORD) {
    throw new Error('ADMIN_PASSWORD must be set in environment. Refusing to start.')
  }
  if (!ADMIN_PASSWORD.startsWith('$2')) {
    throw new Error(
      'ADMIN_PASSWORD must be a bcrypt hash (starts with $2…). Generate with: node -e "console.log(require(\'bcryptjs\').hashSync(\'YOUR_PASSWORD\', 12))"'
    )
  }
}

function getJwtSecret() {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured')
  }
  return JWT_SECRET
}

export function signToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES })
}

export function verifyToken(token) {
  return jwt.verify(token, getJwtSecret())
}

export function parseCookies(req) {
  const header = req.headers.cookie
  if (!header) return {}
  const out = {}
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    const val = part.slice(idx + 1).trim()
    if (key) out[key] = decodeURIComponent(val)
  }
  return out
}

export function readAccessToken(req) {
  const header = req.headers.authorization || ''
  if (header.startsWith('Bearer ')) return header.slice(7)
  const cookies = parseCookies(req)
  return cookies[COOKIE_NAME] || null
}

export function setSessionCookie(res, token) {
  const secure = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production'
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${COOKIE_MAX_AGE_SEC}`,
  ]
  if (secure) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

export function clearSessionCookie(res) {
  const secure = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production'
  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ]
  if (secure) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

export async function validateAdmin(email, password) {
  if (!ADMIN_PASSWORD?.startsWith('$2')) {
    throw new Error('ADMIN_PASSWORD is not a bcrypt hash')
  }
  if ((email || '').toLowerCase() !== ADMIN_EMAIL) {
    return null
  }
  const ok = await bcrypt.compare(password || '', ADMIN_PASSWORD)
  if (!ok) return null
  return { id: 'admin', email: ADMIN_EMAIL, role: 'admin' }
}

export function requireAuth(req, res, next) {
  const token = readAccessToken(req)
  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' })
  }
  try {
    req.user = verifyToken(token)
    next()
  } catch {
    return res.status(401).json({ error: 'Сессия истекла или недействительна' })
  }
}

export function optionalAuth(req, _res, next) {
  const token = readAccessToken(req)
  if (token) {
    try {
      req.user = verifyToken(token)
    } catch {
      req.user = null
    }
  }
  next()
}

export function isAdmin(req) {
  return Boolean(req.user?.role === 'admin')
}
