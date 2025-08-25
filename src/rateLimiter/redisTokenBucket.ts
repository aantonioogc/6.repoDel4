import redis from '../redis/redisClient';
import fs from 'fs';
import path from 'path';

const luaPath = path.join(__dirname, 'token_bucket.lua');
const luaScript = fs.readFileSync(luaPath, 'utf8');

let scriptSha: string | null = null;
async function ensureScript() {
  if (scriptSha) return scriptSha;
  try {
    const sha = await redis.script('LOAD', luaScript) as string;
    scriptSha = sha;
    return sha;
  } catch (e) {
    scriptSha = null;
    return null;
  }
}

export async function requestTokens(key: string, capacity: number, refillTokensPerSecond: number, requested = 1): Promise<boolean> {
  const refillPerMs = refillTokensPerSecond / 1000.0;
  const now = Date.now();
  await ensureScript();
  try {
    if (scriptSha) {
      const res = await redis.evalsha(scriptSha, 1, key, String(capacity), String(refillPerMs), String(now), String(requested));
      return Number(res) === 1;
    } else {
      const res = await redis.eval(luaScript, 1, key, String(capacity), String(refillPerMs), String(now), String(requested));
      return Number(res) === 1;
    }
  } catch (e) {
    console.error('[tokenBucket] redis error', e);
    return true;
  }
}