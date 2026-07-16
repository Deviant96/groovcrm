import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}

export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Express 5 exposes req.query via a getter-only property.
    // Store parsed/normalized query in res.locals instead of reassigning req.query.
    res.locals.validatedQuery = schema.parse(req.query);
    next();
  };
}
