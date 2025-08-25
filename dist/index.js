"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const server_1 = require("./app/server");
const factory_1 = require("./core/factory");
const logger_1 = require("./logging/logger");
const config_1 = require("./rules/config");
const prometheus_1 = require("./metrics/prometheus");
async function main() {
    const logger = (0, logger_1.buildLogger)();
    const port = Number(process.env.PORT || 3000);
    const ruleConfig = (0, config_1.loadRuleConfig)();
    const { firewallProvider, ruleStore, eventBus } = await (0, factory_1.createFirewallProvider)({ ruleConfig, logger });
    const { app, metricsPath } = (0, server_1.createServer)({ firewallProvider, logger, eventBus, ruleStore });
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
(0, prometheus_1.createPrometheus)();
main().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Fatal error starting BAF:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map