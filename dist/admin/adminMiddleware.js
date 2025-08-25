"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoredAdminToken = getStoredAdminToken;
exports.adminAuth = adminAuth;
exports.rotateAdminToken = rotateAdminToken;
const redisClient_1 = __importDefault(require("../redis/redisClient"));
const crypto_1 = __importDefault(require("crypto"));
const ADMIN_REDIS_KEY = 'baf:admin:token';
async function getStoredAdminToken() {
    try {
        const v = await redisClient_1.default.get(ADMIN_REDIS_KEY);
        if (v)
            return v;
        return process.env.ADMIN_TOKEN || null;
    }
    catch (e) {
        console.error('[admin] error reading token', e);
        return process.env.ADMIN_TOKEN || null;
    }
}
async function adminAuth(req, res, next) {
    const header = req.header('x-admin-token');
    if (!header)
        return res.status(401).json({ error: 'missing_admin_token' });
    const stored = await getStoredAdminToken();
    if (!stored || header !== stored)
        return res.status(403).json({ error: 'invalid_admin_token' });
    next();
}
async function rotateAdminToken() {
    const newToken = crypto_1.default.randomBytes(32).toString('hex');
    await redisClient_1.default.set('baf:admin:token', newToken);
    return newToken;
}
//# sourceMappingURL=adminMiddleware.js.map