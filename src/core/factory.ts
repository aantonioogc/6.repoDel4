import { Logger } from 'winston';
import { FirewallProvider } from './firewall-provider';
import { RpcClient } from './rpc-client';
import { PolicyEngine } from '../rules/policy-engine';
import { RuleConfig } from '../rules/types';
import { InMemoryRateLimiterStore } from '../state/in-memory-store';
import { RuleConfigStore } from '../rules/config-store';
import { EventBus } from '../events/event-bus';

export async function createFirewallProvider(deps: { ruleConfig: RuleConfig; logger: Logger }) {
	const upstreamUrl = process.env.UPSTREAM_RPC_URL || 'http://localhost:8545';
	const rpc = new RpcClient({ upstreamUrl, timeoutMs: 15_000 });

	const rateStore = new InMemoryRateLimiterStore();
	const ruleStore = new RuleConfigStore(deps.ruleConfig);
	const policy = new PolicyEngine(ruleStore, rateStore);
	const eventBus = new EventBus();

	const firewallProvider = new FirewallProvider({ logger: deps.logger, policy, rpc, events: eventBus });

	return { firewallProvider, ruleStore, eventBus };
}