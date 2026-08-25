import { Router } from 'express'
import guestRoutes from '../chat/guestRoutes.js'
import adminRoutes from '../chat/adminRoutes.js'

const router = Router()
router.use(guestRoutes)
router.use('/admin', adminRoutes)

export default router
