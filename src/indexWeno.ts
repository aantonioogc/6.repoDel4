import dotenv from 'dotenv';
dotenv.config();

import { createServer } from './app/server';
import { createFirewallProvider } from './core/factory';
import { buildLogger } from './logging/logger';
import { loadRuleConfig } from './rules/config';
import { createPrometheus } from './metrics/prometheus';

async function main(): Promise<void> {
	const logger = buildLogger();
	const port = Number(process.env.PORT || 3000);

	const ruleConfig = loadRuleConfig();
	const { firewallProvider, ruleStore, eventBus } = await createFirewallProvider({ ruleConfig, logger });

	const { app, metricsPath } = createServer({ firewallProvider, logger, eventBus, ruleStore });
	const server = app.listen(port, () => {
		logger.info(`BAF server listening on port ${port} (metrics on ${metricsPath})`);
	});

	// Graceful shutdown
	process.on('SIGINT', () => {
		logger.warn('Received SIGINT, shutting down...');
		server.close(() => process.exit(0));
	});
	process.on('SIGTERM', () => {
		logger.warn('Received SIGTERM, shutting down...');
		server.close(() => process.exit(0));
	});
}

// Bootstrap metrics registry (side-effectful init in module)
createPrometheus();

main().catch((error) => {
	// eslint-disable-next-line no-console
	console.error('Fatal error starting BAF:', error);
	process.exit(1);
});