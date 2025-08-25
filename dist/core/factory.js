"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFirewallProvider = createFirewallProvider;
const firewall_provider_1 = require("./firewall-provider");
const rpc_client_1 = require("./rpc-client");
const policy_engine_1 = require("../rules/policy-engine");
const in_memory_store_1 = require("../state/in-memory-store");
const redis_store_1 = require("../state/redis-store");
const config_store_1 = require("../rules/config-store");
const event_bus_1 = require("../events/event-bus");
async function createFirewallProvider(deps) {
    const upstreamUrl = process.env.UPSTREAM_RPC_URL || 'http://localhost:8545';
    const rpc = new rpc_client_1.RpcClient({ upstreamUrl, timeoutMs: 15000 });
    // Prefer Redis stores when REDIS_URL present, else fallback to in-memory
    const rateStore = process.env.REDIS_URL ? new redis_store_1.RedisStores(process.env.REDIS_URL) : new in_memory_store_1.InMemoryRateLimiterStore();
    const ruleStore = new config_store_1.RuleConfigStore(deps.ruleConfig);
    const policy = new policy_engine_1.PolicyEngine(ruleStore, rateStore);
    const eventBus = new event_bus_1.EventBus();
    const firewallProvider = new firewall_provider_1.FirewallProvider({ logger: deps.logger, policy, rpc, events: eventBus });
    return { firewallProvider, ruleStore, eventBus };
}
//# sourceMappingURL=factory.js.map