import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma/client.js';
import { env } from '../utils/env.js';
import { AppError } from '../utils/errors.js';
import type { AuthPayload } from '../middleware/authenticate.js';

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseDurationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * (multipliers[unit] ?? multipliers.d);
}

export async function login(email: string, password: string, rememberMe = false) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'Invalid email or password');
  }

  const payload: AuthPayload = { userId: user.id, email: user.email };
  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);

  const refreshExpires = rememberMe ? env.JWT_REFRESH_REMEMBER_EXPIRES_IN : env.JWT_REFRESH_EXPIRES_IN;
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: refreshExpires,
  } as jwt.SignOptions);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + parseDurationToMs(refreshExpires)),
    },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  };
}

export async function refresh(refreshToken: string) {
  let payload: AuthPayload;
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as AuthPayload;
  } catch {
    throw new AppError(401, 'Invalid refresh token');
  }

  const stored = await prisma.refreshToken.findFirst({
    where: {
      userId: payload.userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: { gt: new Date() },
    },
  });

  if (!stored) {
    throw new AppError(401, 'Refresh token revoked or expired');
  }

  const accessToken = jwt.sign(
    { userId: payload.userId, email: payload.email },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as jwt.SignOptions,
  );

  return { accessToken };
}

export async function logout(refreshToken?: string) {
  if (!refreshToken) return;
  await prisma.refreshToken.deleteMany({
    where: { tokenHash: hashToken(refreshToken) },
  });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  if (!user) throw new AppError(404, 'User not found');
  return user;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found');

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new AppError(400, 'Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await prisma.refreshToken.deleteMany({ where: { userId } });
}
