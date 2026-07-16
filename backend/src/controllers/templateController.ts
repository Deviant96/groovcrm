import type { Request, Response, NextFunction } from 'express';
import * as templateService from '../services/templateService.js';
import { validatedBody } from '../middleware/validate.js';

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await templateService.listTemplates());
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await templateService.getTemplate(req.params.id as string));
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await templateService.createTemplate(validatedBody(req, res)));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await templateService.updateTemplate(req.params.id as string, validatedBody(req, res)));
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await templateService.deleteTemplate(req.params.id as string);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function preview(req: Request, res: Response, next: NextFunction) {
  try {
    const { message, company, instagram, website, phone, score } = validatedBody<{
      message: string;
      company?: string | null;
      instagram?: string | null;
      website?: string | null;
      phone?: string | null;
      score?: number | null;
    }>(req, res);
    res.json(templateService.previewTemplate(message, { company, instagram, website, phone, score }));
  } catch (err) {
    next(err);
  }
}

export async function generateWhatsApp(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await templateService.generateWhatsApp(validatedBody(req, res)));
  } catch (err) {
    next(err);
  }
}
