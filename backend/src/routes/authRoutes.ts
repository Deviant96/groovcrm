import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validate.js';
import { changePasswordSchema, loginSchema, refreshSchema } from '../validators/schemas.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', authLimiter, validateBody(loginSchema), authController.login);
router.post('/refresh', validateBody(refreshSchema), authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.me);
router.post('/change-password', authenticate, validateBody(changePasswordSchema), authController.changePassword);

export default router;
