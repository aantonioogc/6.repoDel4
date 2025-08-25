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
        const [count] = (await multi.exec());
        return Number(count);
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