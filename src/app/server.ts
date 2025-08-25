import express, { Request, Response } from 'express';
import path from 'path';
import { FirewallProvider } from '../core/firewall-provider';
import { Logger } from 'winston';
import { getMetricsRegistry } from '../metrics/prometheus';
import { EventBus } from '../events/event-bus';
import { RuleConfigStore } from '../rules/config-store';

interface CreateServerDeps {
	firewallProvider: FirewallProvider;
	logger: Logger;
	eventBus: EventBus;
	ruleStore: RuleConfigStore;
}

export function createServer({ firewallProvider, logger, eventBus, ruleStore }: CreateServerDeps) {
	const app = express();
	app.disable('x-powered-by');
	app.use(express.json({ limit: '1mb' }));

	const registry = getMetricsRegistry();
	const metricsPath = '/metrics';
	const adminToken = process.env.ADMIN_TOKEN || '';

	app.get('/healthz', (_req: Request, res: Response) => {
		res.status(200).send('ok');
	});

	app.get('/dashboard', (_req: Request, res: Response) => {
		res.sendFile(path.join(__dirname, 'static', 'dashboard.html'));
	});

	app.get('/events', (req: Request, res: Response) => {
		res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
		res.flushHeaders();
		eventBus.subscribe(res);
		res.write(`event: ready\ndata: {"status":"subscribed"}\n\n`);
	});

	app.get(metricsPath, async (_req: Request, res: Response) => {
		try {
			res.set('Content-Type', registry.contentType);
			res.end(await registry.metrics());
		} catch (err) {
			logger.error('Error generating metrics', { error: err });
			res.status(500).send('metrics error');
		}
	});

	// Admin API to update rules dynamically
	app.post('/admin/rules', (req: Request, res: Response) => {
		if (!adminToken || req.headers['x-admin-token'] !== adminToken) {
			return res.status(401).json({ error: 'unauthorized' });
		}
		try {
			ruleStore.update(req.body || {});
			return res.status(200).json({ ok: true, rules: ruleStore.get() });
		} catch (e) {
			logger.error('Failed to update rules', { error: e });
			return res.status(400).json({ error: 'bad_request' });
		}
	});

	app.get('/admin/rules', (req: Request, res: Response) => {
		if (!adminToken || req.headers['x-admin-token'] !== adminToken) {
			return res.status(401).json({ error: 'unauthorized' });
		}
		return res.status(200).json({ rules: ruleStore.get() });
	});

	app.post('/', async (req: Request, res: Response) => {
		const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || req.ip || 'unknown';
		try {
			const result = await firewallProvider.handleJsonRpc(req.body, clientIp);
			res.status(200).json(result);
		} catch (error) {
			logger.error('Unhandled error in JSON-RPC handler', { error });
			res.status(500).json({ error: { code: -32603, message: 'Internal error' } });
		}
	});

	return { app, metricsPath };
}