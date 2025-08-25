"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminMiddleware_1 = require("./adminMiddleware");
const redisClient_1 = __importDefault(require("../redis/redisClient"));
const router = express_1.default.Router();
router.use(adminMiddleware_1.adminAuth);
router.get('/rules', async (req, res) => {
    const r = await redisClient_1.default.get('baf:rules:static');
    const parsed = r ? JSON.parse(r) : {};
    res.json(parsed);
});
router.post('/rules', express_1.default.json(), async (req, res) => {
    const body = req.body || {};
    await redisClient_1.default.set('baf:rules:static', JSON.stringify(body));
    res.json({ ok: true, rules: body });
});
router.post('/rotate-token', async (req, res) => {
    const newToken = await (0, adminMiddleware_1.rotateAdminToken)();
    res.json({ ok: true, admin_token: newToken });
});
exports.default = router;
//# sourceMappingURL=adminRoutes.js.map