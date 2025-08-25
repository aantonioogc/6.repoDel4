"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const prometheus_1 = require("../metrics/prometheus");
function createServer({ firewallProvider, logger, eventBus, ruleStore }) {
    const app = (0, express_1.default)();
    app.disable('x-powered-by');
    app.use(express_1.default.json({ limit: '1mb' }));
    const registry = (0, prometheus_1.getMetricsRegistry)();
    const metricsPath = '/metrics';
    const adminToken = process.env.ADMIN_TOKEN || '';
    app.get('/healthz', (_req, res) => {
        res.status(200).send('ok');
    });
    app.get('/dashboard', (_req, res) => {
        res.sendFile(path_1.default.join(__dirname, 'static', 'dashboard.html'));
    });
    app.get('/events', (req, res) => {
        res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
        res.flushHeaders();
        eventBus.subscribe(res);
        res.write(`event: ready\ndata: {"status":"subscribed"}\n\n`);
    });
    app.get(metricsPath, async (_req, res) => {
        try {
            res.set('Content-Type', registry.contentType);
            res.end(await registry.metrics());
        }
        catch (err) {
            logger.error('Error generating metrics', { error: err });
            res.status(500).send('metrics error');
        }
    });
    // Admin API to update rules dynamically
    app.post('/admin/rules', (req, res) => {
        if (!adminToken || req.headers['x-admin-token'] !== adminToken) {
            return res.status(401).json({ error: 'unauthorized' });
        }
        try {
            ruleStore.update(req.body || {});
            return res.status(200).json({ ok: true, rules: ruleStore.get() });
        }
        catch (e) {
            logger.error('Failed to update rules', { error: e });
            return res.status(400).json({ error: 'bad_request' });
        }
    });
    app.get('/admin/rules', (req, res) => {
        if (!adminToken || req.headers['x-admin-token'] !== adminToken) {
            return res.status(401).json({ error: 'unauthorized' });
        }
        return res.status(200).json({ rules: ruleStore.get() });
    });
    app.post('/', async (req, res) => {
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'unknown';
        try {
            const result = await firewallProvider.handleJsonRpc(req.body, clientIp);
            res.status(200).json(result);
        }
        catch (error) {
            logger.error('Unhandled error in JSON-RPC handler', { error });
            res.status(500).json({ error: { code: -32603, message: 'Internal error' } });
        }
    });
    return { app, metricsPath };
}
//# sourceMappingURL=server.js.map