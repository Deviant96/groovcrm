import { Router } from 'express';
import * as templateController from '../controllers/templateController.js';
import { validateBody } from '../middleware/validate.js';
import {
  templateCreateSchema,
  templateUpdateSchema,
  whatsappGenerateSchema,
} from '../validators/schemas.js';
import { z } from 'zod';

const router = Router();

router.get('/', templateController.list);
router.post('/', validateBody(templateCreateSchema), templateController.create);
router.post(
  '/preview',
  validateBody(
    z.object({
      message: z.string().min(1),
      company: z.string().optional().nullable(),
      instagram: z.string().optional().nullable(),
      website: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      score: z.number().optional().nullable(),
    }),
  ),
  templateController.preview,
);
router.get('/:id', templateController.getById);
router.patch('/:id', validateBody(templateUpdateSchema), templateController.update);
router.delete('/:id', templateController.remove);

export const whatsappRouter = Router();
whatsappRouter.post('/generate', validateBody(whatsappGenerateSchema), templateController.generateWhatsApp);

export default router;
