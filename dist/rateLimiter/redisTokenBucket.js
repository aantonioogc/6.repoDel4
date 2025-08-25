"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestTokens = requestTokens;
const redisClient_1 = __importDefault(require("../redis/redisClient"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const luaPath = path_1.default.join(__dirname, 'token_bucket.lua');
const luaScript = fs_1.default.readFileSync(luaPath, 'utf8');
let scriptSha = null;
async function ensureScript() {
    if (scriptSha)
        return scriptSha;
    try {
        const sha = await redisClient_1.default.script('LOAD', luaScript);
        scriptSha = sha;
        return sha;
    }
    catch (e) {
        scriptSha = null;
        return null;
    }
}
async function requestTokens(key, capacity, refillTokensPerSecond, requested = 1) {
    const refillPerMs = refillTokensPerSecond / 1000.0;
    const now = Date.now();
    await ensureScript();
    try {
        if (scriptSha) {
            const res = await redisClient_1.default.evalsha(scriptSha, 1, key, String(capacity), String(refillPerMs), String(now), String(requested));
            return Number(res) === 1;
        }
        else {
            const res = await redisClient_1.default.eval(luaScript, 1, key, String(capacity), String(refillPerMs), String(now), String(requested));
            return Number(res) === 1;
        }
    }
    catch (e) {
        console.error('[tokenBucket] redis error', e);
        return true;
    }
}
//# sourceMappingURL=redisTokenBucket.js.map