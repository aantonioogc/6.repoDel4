"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRateLimited = isRateLimited;
const redisClient_1 = __importDefault(require("../redis/redisClient"));
const uuid_1 = require("uuid");
async function isRateLimited(key, limit, windowSeconds) {
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);
    const member = (0, uuid_1.v4)();
    const multi = redisClient_1.default.multi();
    multi.zadd(key, now.toString(), member);
    multi.zremrangebyscore(key, 0, windowStart.toString());
    multi.zcard(key);
    multi.expire(key, windowSeconds + 2);
    const res = await multi.exec();
    const zcardReply = res && res[2] && res[2][1];
    const count = typeof zcardReply === 'number' ? zcardReply : parseInt(String(zcardReply || '0'), 10);
    return count > limit;
}
//# sourceMappingURL=redisSlidingWindow.js.map