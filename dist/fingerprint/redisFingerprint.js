"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFingerprint = registerFingerprint;
const redisClient_1 = __importDefault(require("../redis/redisClient"));
const crypto_1 = __importDefault(require("crypto"));
function stableStringify(obj) {
    if (obj === null || typeof obj !== 'object')
        return JSON.stringify(obj);
    if (Array.isArray(obj))
        return '[' + obj.map(stableStringify).join(',') + ']';
    const keys = Object.keys(obj).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}
function hashPayload(payload) {
    const canonical = stableStringify(payload);
    return crypto_1.default.createHash('sha256').update(canonical).digest('hex');
}
async function registerFingerprint(payload, windowSeconds, maxRepeats) {
    const hash = hashPayload(payload);
    const key = `baf:fingerprint:${hash}`;
    const lua = `
    local v = redis.call("INCR", KEYS[1])
    if tonumber(v) == 1 then
      redis.call("EXPIRE", KEYS[1], ARGV[1])
    end
    return v
  `;
    const res = await redisClient_1.default.eval(lua, 1, key, String(windowSeconds));
    const repeats = typeof res === 'number' ? res : parseInt(String(res || '0'), 10);
    const blocked = repeats > maxRepeats;
    return { repeats, blocked, hash };
}
//# sourceMappingURL=redisFingerprint.js.map