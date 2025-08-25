import { Request, Response, NextFunction } from 'express';
import redis from '../redis/redisClient';
import crypto from 'crypto';

const ADMIN_REDIS_KEY = 'baf:admin:token';

export async function getStoredAdminToken(): Promise<string | null> {
  try {
    const v = await redis.get(ADMIN_REDIS_KEY);
    if (v) return v;
    return process.env.ADMIN_TOKEN || null;
  } catch (e) {
    console.error('[admin] error reading token', e);
    return process.env.ADMIN_TOKEN || null;
  }
}

export async function adminAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('x-admin-token');
  if (!header) return res.status(401).json({ error: 'missing_admin_token' });

  const stored = await getStoredAdminToken();
  if (!stored || header !== stored) return res.status(403).json({ error: 'invalid_admin_token' });
  next();
}

export async function rotateAdminToken(): Promise<string> {
  const newToken = crypto.randomBytes(32).toString('hex');
  await redis.set('baf:admin:token', newToken);
  return newToken;
}