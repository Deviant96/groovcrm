import type { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService.js';
import { validatedBody } from '../middleware/validate.js';

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, rememberMe } = validatedBody<{
      email: string;
      password: string;
      rememberMe?: boolean;
    }>(req, res);
    const result = await authService.login(email, password, rememberMe);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = validatedBody<{ refreshToken: string }>(req, res);
    const result = await authService.refresh(refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const body = validatedBody<{ refreshToken?: string }>(req, res);
    await authService.logout(body.refreshToken);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getMe(req.user!.userId);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { currentPassword, newPassword } = validatedBody<{
      currentPassword: string;
      newPassword: string;
    }>(req, res);
    await authService.changePassword(req.user!.userId, currentPassword, newPassword);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
