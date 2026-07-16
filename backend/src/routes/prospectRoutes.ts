import { Router } from 'express';
import * as prospectController from '../controllers/prospectController.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  bulkDeleteSchema,
  bulkStatusSchema,
  noteCreateSchema,
  prospectCreateSchema,
  prospectQuerySchema,
  prospectUpdateSchema,
} from '../validators/schemas.js';

const router = Router();

router.get('/follow-ups', prospectController.followUps);
router.get('/stats', prospectController.stats);
router.get('/search', prospectController.search);
router.get('/', validateQuery(prospectQuerySchema), prospectController.list);
router.post('/', validateBody(prospectCreateSchema), prospectController.create);
router.post('/bulk/status', validateBody(bulkStatusSchema), prospectController.bulkStatus);
router.post('/bulk/delete', validateBody(bulkDeleteSchema), prospectController.bulkDelete);
router.get('/:id', prospectController.getById);
router.patch('/:id', validateBody(prospectUpdateSchema), prospectController.update);
router.delete('/:id', prospectController.remove);
router.post('/:id/notes', validateBody(noteCreateSchema), prospectController.addNote);
router.delete('/:id/notes/:noteId', prospectController.deleteNote);

export default router;
