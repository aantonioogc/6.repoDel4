"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getValue = exports.setValue = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const redis = new ioredis_1.default({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
});
const setValue = async (key, value) => {
    await redis.set(key, value);
};
exports.setValue = setValue;
const getValue = async (key) => {
    return await redis.get(key);
};
exports.getValue = getValue;
exports.default = redis;
//# sourceMappingURL=redisClient.js.map