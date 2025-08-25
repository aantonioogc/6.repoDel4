import express from 'express';
import bodyParser from 'body-parser';
import adminRoutes from './admin/adminRoutes';
import redis from './redis/redisClient';
import { registerFingerprint } from './fingerprint/redisFingerprint';
import { isRateLimited } from './rateLimiter/redisSlidingWindow';
import { requestTokens } from './rateLimiter/redisTokenBucket';
import axios from 'axios';
import { setValue, getValue } from "./redis/redisClient";
import { isHexString, parseTransaction } from 'ethers/lib/utils';
import path from 'path';

(async () => {
  await setValue("test", "hola desde redis");
  const value = await getValue("test");
  console.log("Valor en Redis:", value);
})();

const app = express();
app.use(bodyParser.json());

// Mount admin routes
app.use('/admin', adminRoutes);

// Health endpoint
app.get('/healthz', (req, res) => res.json({ status: 'ok' }));

// Dashboard endpoint
  app.get('/dashboard', (req, res) => {
    res.sendFile(path.resolve(process.cwd(), 'src', 'app', 'static', 'dashboard.html'));
  });

// Simple in-memory cache for upstream chainId to avoid calling upstream on every request
let upstreamChainIdCache: { value: number | null; ts: number } = { value: null, ts: 0 };
const CHAINID_CACHE_MS = Number(process.env.BAF_CHAINID_CACHE_MS || 5000);

async function getUpstreamChainId(rpcUrl: string): Promise<number | null> {
  const now = Date.now();
  if (upstreamChainIdCache.value != null && (now - upstreamChainIdCache.ts) < CHAINID_CACHE_MS) {
    return upstreamChainIdCache.value;
  }

  try {
    const res = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 1e6),
      method: 'eth_chainId',
      params: []
    }, { timeout: Number(process.env.BAF_UPSTREAM_TIMEOUT_MS || 5000) });

    const hex = res?.data?.result;
    if (typeof hex === 'string') {
      const v = hex.startsWith('0x') ? parseInt(hex, 16) : parseInt(hex, 10);
      upstreamChainIdCache = { value: v, ts: Date.now() };
      return v;
    }
    return null;
  } catch (e) {
    // don't throw — return null and let caller decide
    const errMsg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : e;
    console.warn('[baf] warning: could not fetch upstream chainId:', errMsg);
    return null;
  }
}

// Example JSON-RPC endpoint (proxy with BAF checks)
app.post('/rpc', async (req, res) => {
  try {
    const ip = (req.ip || req.headers['x-forwarded-for'] || 'unknown').toString();
    const payload = req.body;

    // Determine upstream rpc URL early (used for chainId checks and final forward)
    const rpcUrl = process.env.RPC_URL || process.env.BAF_URL || 'http://127.0.0.1:8545';

    // Blocked methods from static rules in redis or env
    const staticRulesRaw = await redis.get('baf:rules:static');
    const staticRules = staticRulesRaw ? JSON.parse(staticRulesRaw) : {};
    const blockedMethods = (staticRules.static && staticRules.static.blockedMethods) || (process.env.BAF_BLOCKED_METHODS ? process.env.BAF_BLOCKED_METHODS.split(',') : []);

    if (payload && payload.method && blockedMethods.includes(payload.method)) {
      return res.status(403).json({ error: 'Blocked by BAF: blocked_method' });
    }

    // IP sliding-window rate limit
    const ipLimit = Number(process.env.BAF_RATE_LIMIT_IP_TPS || 10);
    const windowSec = Number(process.env.BAF_WINDOW_SECONDS || 2);
    const ipKey = `baf:rate:ip:${ip}`;
    const ipBlocked = await isRateLimited(ipKey, ipLimit, windowSec);
    if (ipBlocked) return res.status(429).json({ error: 'Blocked by BAF: rate_limit_ip' });

    // Address rate limit
    const from = payload?.params?.[0]?.from;
    if (from) {
      const addrLimit = Number(process.env.BAF_RATE_LIMIT_ADDRESS_TPS || 5);
      const addrKey = `baf:rate:addr:${from}`;
      const addrBlocked = await isRateLimited(addrKey, addrLimit, windowSec);
      if (addrBlocked) return res.status(429).json({ error: 'Blocked by BAF: rate_limit_address' });
    }

    // Fingerprint
    const fwindow = Number(process.env.BAF_FINGERPRINT_WINDOW_SECONDS || 5);
    const fmax = Number(process.env.BAF_FINGERPRINT_MAX_REPEATS || 10);
    const fp = await registerFingerprint(payload, fwindow, fmax);
    if (fp.blocked) return res.status(429).json({ error: 'Blocked by BAF: repeated_payload' });

    // Token-bucket
    const tbCapacity = Number(process.env.BAF_TB_CAPACITY || 100);
    const tbRefill = Number(process.env.BAF_TB_REFILL_PER_SECOND || 100);
    const tbKey = `baf:tb:ip:${ip}`;
    const tbAllowed = await requestTokens(tbKey, tbCapacity, tbRefill, 1);
    if (!tbAllowed) return res.status(429).json({ error: 'Blocked by BAF: token_bucket' });

    // --- RAW TX specific checks: parse and apply chainId / replay protection ---
    if (payload?.method === 'eth_sendRawTransaction') {
      const raw = payload?.params?.[0];
      const maxLen = Number(process.env.BAF_MAX_RAW_TX_LEN || 30000);

      if (typeof raw === 'string' && raw.length > maxLen) {
        return res.status(403).json({ error: 'Blocked by BAF: raw_tx_too_large' });
      }

      // If it's a hex string attempt to parse the tx and run chainId/replay checks
      if (typeof raw === 'string' && isHexString(raw)) {
        let txParsed: any;
        try {
          txParsed = parseTransaction(raw);
        } catch (e) {
          return res.status(400).json({ error: 'Blocked by BAF: invalid_raw_tx' });
        }

        const txType = txParsed.type; // 0 or 2 (ethers v5 parseTransaction)
        const rawTxChainId = (txParsed as any).chainId;
        const txChainId = (rawTxChainId === 0 || rawTxChainId == null) ? null : rawTxChainId;
        const txV = (txParsed as any).v ?? null;

        // 1) Replay protection: Legacy (type 0) signed without chainId (v 27/28 or missing chainId)
        const isLegacyUnsignedByEIP155 = (txType === 0 || txV === 27 || txV === 28) && (txChainId == null);
        if (isLegacyUnsignedByEIP155) {
          return res.status(403).json({ error: 'Blocked by BAF: replay_protection' });
        }

        // 2) ChainId mismatch: if tx has chainId and upstream chainId exists and differs -> block
        if (txChainId != null) {
          const upstreamChainId = await getUpstreamChainId(rpcUrl);
          if (upstreamChainId != null && Number(txChainId) !== Number(upstreamChainId)) {
            return res.status(403).json({ error: 'Blocked by BAF: chainId_mismatch', details: { txChainId, upstreamChainId } });
          }
        }

        // (other raw tx heuristics could go here)
      }
    }

    // Forward to upstream
    const upstreamRes = await axios.post(rpcUrl, payload, { timeout: Number(process.env.BAF_UPSTREAM_TIMEOUT_MS || 10000) });

    res.status(upstreamRes.status).json(upstreamRes.data);
  } catch (e: any) {
    console.error('[baf] internal', e?.message || e);
    res.status(500).json({ error: 'internal_error', detail: e?.message });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`[baf] listening on ${port}`);
});
