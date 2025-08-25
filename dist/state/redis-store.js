"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisStores = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
class RedisStores {
    constructor(url) {
        this.client = new ioredis_1.default(url || process.env.REDIS_URL || 'redis://localhost:6379');
    }
    async incrementAndGetCount(key, windowMs) {
        const ttlSeconds = Math.ceil(windowMs / 1000);
        const multi = this.client.multi();
        multi.incr(key);
        multi.expire(key, ttlSeconds, 'NX');
        const [countReply] = (await multi.exec());
        const count = Array.isArray(countReply) ? Number(countReply[1]) : Number(countReply);
        return Number.isFinite(count) ? count : 0;
    }
    async addToSetAndGetSize(key, member, ttlMs) {
        const ttlSeconds = Math.ceil(ttlMs / 1000);
        const multi = this.client.multi();
        multi.sadd(key, member);
        multi.expire(key, ttlSeconds, 'NX');
        multi.scard(key);
        const replies = await multi.exec();
        const scardReply = replies && replies[2] && (Array.isArray(replies[2]) ? replies[2][1] : replies[2]);
        return Number(scardReply) || 0;
    }
    async get(key) {
        const v = await this.client.get(key);
        return v === null ? undefined : v;
    }
    async set(key, value, ttlMs) {
        if (ttlMs && ttlMs > 0) {
            await this.client.set(key, value, 'PX', ttlMs);
        }
        else {
            await this.client.set(key, value);
        }
    }
    async delete(key) {
        await this.client.del(key);
    }
}
exports.RedisStores = RedisStores;
//# sourceMappingURL=redis-store.js.map