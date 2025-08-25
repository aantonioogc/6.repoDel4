import express from 'express';
import { adminAuth, rotateAdminToken } from './adminMiddleware';
import redis from '../redis/redisClient';

const router = express.Router();

router.use(adminAuth);

router.get('/rules', async (req, res) => {
  const r = await redis.get('baf:rules:static');
  const parsed = r ? JSON.parse(r) : {};
  res.json(parsed);
});

router.post('/rules', express.json(), async (req, res) => {
  const body = req.body || {};
  await redis.set('baf:rules:static', JSON.stringify(body));
  res.json({ ok: true, rules: body });
});

router.post('/rotate-token', async (req, res) => {
  const newToken = await rotateAdminToken();
  res.json({ ok: true, admin_token: newToken });
});

export default router;