import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

/** Express 5 makes req.body / req.query getter-only — never reassign them. */
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.locals.validatedBody = schema.parse(req.body);
    next();
  };
}

export function validatedBody<T>(req: Request, res: Response): T {
  return (res.locals.validatedBody ?? req.body) as T;
}
