import { Router } from 'express';
import multer from 'multer';
import * as importExportController from '../controllers/importExportController.js';
import { validateBody } from '../middleware/validate.js';
import { importConfirmSchema, importMappingSchema } from '../validators/schemas.js';
import { z } from 'zod';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

router.post('/parse', upload.single('file'), importExportController.parseCsv);
router.post(
  '/preview',
  validateBody(
    z.object({
      mapping: importMappingSchema,
      rows: z.array(z.record(z.string(), z.string().nullable())).optional(),
      csv: z.string().optional(),
      headers: z.array(z.string()).optional(),
    }),
  ),
  importExportController.preview,
);
router.post('/confirm', validateBody(importConfirmSchema), importExportController.confirm);

export const exportRouter = Router();
exportRouter.get('/csv', importExportController.exportCsv);

export default router;
