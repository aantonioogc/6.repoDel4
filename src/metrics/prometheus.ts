import client, { Registry, Counter, Histogram } from 'prom-client';

let registry: Registry | null = null;

export const metrics = {
	jsonRpcRequestsTotal: new Counter({
		name: 'baf_jsonrpc_requests_total',
		help: 'Total JSON-RPC requests processed by the firewall',
		labelNames: ['method', 'decision', 'reason'] as const
	}),
	jsonRpcForwardLatencyMs: new Histogram({
		name: 'baf_jsonrpc_forward_latency_ms',
		help: 'Latency forwarding JSON-RPC to upstream in milliseconds',
		buckets: [5, 10, 20, 50, 100, 200, 500, 1000, 2000]
	}),
	jsonRpcBlockedTotal: new Counter({
		name: 'baf_jsonrpc_blocked_total',
		help: 'Total JSON-RPC requests blocked',
		labelNames: ['method', 'reason'] as const
	})
};

export function createPrometheus(): void {
	if (registry) return; // singleton init
	registry = new client.Registry();
	client.collectDefaultMetrics({ register: registry, prefix: 'baf_' });
	registry.registerMetric(metrics.jsonRpcRequestsTotal);
	registry.registerMetric(metrics.jsonRpcForwardLatencyMs);
	registry.registerMetric(metrics.jsonRpcBlockedTotal);
}

export function getMetricsRegistry(): Registry {
	if (!registry) {
		createPrometheus();
	}
	return registry as Registry;
}