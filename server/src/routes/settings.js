import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { badRequest, fail } from '../errors.js'
import { MEDIA_PUBLIC_BASE } from '../chat/config.js'
import {
  getAdminAvatarUrlRaw,
  getStaffAvatarUrl,
  setAdminAvatarUrl,
} from '../settings.js'

const router = Router()

/** Public — for chat UI / guests (staff avatar only). */
router.get('/chat', async (_req, res) => {
  try {
    const staffAvatarUrl = await getStaffAvatarUrl()
    res.json({ staffAvatarUrl })
  } catch (e) {
    fail(res, e)
  }
})

router.get('/admin-avatar', requireAuth, async (_req, res) => {
  try {
    const avatarUrl = await getAdminAvatarUrlRaw()
    res.json({ avatarUrl })
  } catch (e) {
    fail(res, e)
  }
})

router.put('/admin-avatar', requireAuth, async (req, res) => {
  try {
    const raw = req.body?.avatarUrl
    if (raw == null || raw === '') {
      await setAdminAvatarUrl(null)
      return res.json({ avatarUrl: null })
    }
    const url = String(raw).trim()
    const allowed =
      url.startsWith(`${MEDIA_PUBLIC_BASE}/images/`) ||
      url.startsWith('/media/images/') ||
      url === '/logo-rob.svg'
    if (!allowed) {
      throw badRequest('Некорректный URL аватара')
    }
    const avatarUrl = await setAdminAvatarUrl(url)
    res.json({ avatarUrl })
  } catch (e) {
    fail(res, e)
  }
})

export default router
