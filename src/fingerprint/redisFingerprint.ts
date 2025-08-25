import redis from '../redis/redisClient';
import crypto from 'crypto';

function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

function hashPayload(payload: any): string {
  const canonical = stableStringify(payload);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export async function registerFingerprint(payload: any, windowSeconds: number, maxRepeats: number) {
  const hash = hashPayload(payload);
  const key = `baf:fingerprint:${hash}`;

  const lua = `
    local v = redis.call("INCR", KEYS[1])
    if tonumber(v) == 1 then
      redis.call("EXPIRE", KEYS[1], ARGV[1])
    end
    return v
  `;
  const res = await redis.eval(lua, 1, key, String(windowSeconds));
  const repeats = typeof res === 'number' ? res : parseInt(String(res || '0'), 10);
  const blocked = repeats > maxRepeats;
  return { repeats, blocked, hash };
}