import redis from '../redis/redisClient';
import { v4 as uuidv4 } from 'uuid';

export async function isRateLimited(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - (windowSeconds * 1000);
  const member = uuidv4();

  const multi = redis.multi();
  multi.zadd(key, now.toString(), member);
  multi.zremrangebyscore(key, 0, windowStart.toString());
  multi.zcard(key);
  multi.expire(key, windowSeconds + 2);

  const res = await multi.exec();
  const zcardReply = res && res[2] && res[2][1];
  const count = typeof zcardReply === 'number' ? zcardReply : parseInt(String(zcardReply || '0'), 10);

  return count > limit;
}