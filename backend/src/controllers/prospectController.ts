import type { Request, Response, NextFunction } from 'express';
import * as prospectService from '../services/prospectService.js';
import { validatedBody } from '../middleware/validate.js';
import { prospectQuerySchema } from '../validators/schemas.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = prospectQuerySchema.parse(req.query);
    const result = await prospectService.listProspects(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const prospect = await prospectService.getProspect(req.params.id as string);
    res.json(prospect);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const prospect = await prospectService.createProspect(validatedBody(req, res));
    res.status(201).json(prospect);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const prospect = await prospectService.updateProspect(
      req.params.id as string,
      validatedBody(req, res),
    );
    res.json(prospect);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await prospectService.deleteProspect(req.params.id as string);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function bulkStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const body = validatedBody<{ ids: string[]; status: string }>(req, res);
    const result = await prospectService.bulkUpdateStatus(body.ids, body.status as never);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function bulkDelete(req: Request, res: Response, next: NextFunction) {
  try {
    const body = validatedBody<{ ids: string[] }>(req, res);
    const result = await prospectService.bulkDelete(body.ids);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function addNote(req: Request, res: Response, next: NextFunction) {
  try {
    const body = validatedBody<{ content: string }>(req, res);
    const note = await prospectService.addNote(req.params.id as string, body.content);
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
}

export async function deleteNote(req: Request, res: Response, next: NextFunction) {
  try {
    await prospectService.deleteNote(req.params.noteId as string);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function followUps(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await prospectService.getFollowUps();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function stats(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await prospectService.getStats();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const q = String(req.query.q ?? '');
    const result = await prospectService.searchProspects(q);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
