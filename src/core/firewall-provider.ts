import { BaseProvider } from './base-provider';
import { Logger } from 'winston';
import { PolicyEngine } from '../rules/policy-engine';
import { RpcClient } from './rpc-client';
import { metrics } from '../metrics/prometheus';
import { isBatch, makeJsonRpcError, JsonRpcRequest } from '../validation/validators';
import { EventBus } from '../events/event-bus';

export class FirewallProvider extends BaseProvider {
	private readonly policy: PolicyEngine;
	private readonly rpc: RpcClient;
	private readonly events: EventBus;

	constructor(deps: { logger: Logger; policy: PolicyEngine; rpc: RpcClient; events: EventBus }) {
		super(deps.logger);
		this.policy = deps.policy;
		this.rpc = deps.rpc;
		this.events = deps.events;
	}

	async handleJsonRpc(payload: unknown, clientIp: string): Promise<unknown> {
		if (isBatch(payload)) {
			const ctxs = payload.map((p) => this.parseAndExtractSingle(p, clientIp));
			const results = await Promise.all(ctxs.map(async (ctx) => {
				const decision = await this.policy.evaluate({ method: ctx.method, params: ctx.params, clientIp: ctx.clientIp, extracted: { from: ctx.extracted.fromAddress, to: ctx.extracted.toAddress, nonce: ctx.extracted.nonce, gasPriceWei: ctx.analytics.gasPriceWei, gasLimit: ctx.analytics.gasLimit, payloadHash: ctx.analytics.payloadHash } });
				metrics.jsonRpcRequestsTotal.labels(ctx.method, decision.decision, decision.rule || decision.reason).inc();
				if (decision.decision === 'block') {
					metrics.jsonRpcBlockedTotal.labels(ctx.method, decision.rule || decision.reason).inc();
					this.logger.warn('Blocking JSON-RPC (batch)', { method: ctx.method, clientIp, reason: decision.reason, rule: decision.rule, reqId: ctx.reqId });
					this.events.emit({ type: 'block', timestamp: Date.now(), method: ctx.method, clientIp, reason: decision.reason, rule: decision.rule, from: ctx.extracted.fromAddress, to: ctx.extracted.toAddress, reqId: ctx.reqId });
					return makeJsonRpcError(ctx.id, -32000, `Blocked by BAF: ${decision.reason}`, { reqId: ctx.reqId, rule: decision.rule });
				}
				this.events.emit({ type: 'allow', timestamp: Date.now(), method: ctx.method, clientIp, reason: 'allow', rule: decision.rule, from: ctx.extracted.fromAddress, to: ctx.extracted.toAddress, reqId: ctx.reqId });
				return null;
			}));

			const toForward = ctxs.map((c, i) => (results[i] === null ? payload[i] : null));
			let forwarded: unknown[] = [];
			if (toForward.some((x) => x !== null)) {
				const forwardPayload: JsonRpcRequest[] = (toForward.filter((x): x is JsonRpcRequest => x !== null));
				const end = metrics.jsonRpcForwardLatencyMs.startTimer();
				try {
					const data = await this.send(forwardPayload);
					forwarded = Array.isArray(data) ? data : [data];
				} finally { end(); }
			}

			const merged: unknown[] = [];
			let fIdx = 0;
			for (let i = 0; i < results.length; i++) {
				if (results[i] !== null) merged.push(results[i]);
				else { merged.push(forwarded[fIdx++] ?? makeJsonRpcError(ctxs[i].id, -32603, 'Internal error', { reqId: ctxs[i].reqId })); }
			}
			return merged;
		}

		const ctx = this.parseAndExtractSingle(payload, clientIp);
		const decision = await this.policy.evaluate({ method: ctx.method, params: ctx.params, clientIp: ctx.clientIp, extracted: { from: ctx.extracted.fromAddress, to: ctx.extracted.toAddress, nonce: ctx.extracted.nonce, gasPriceWei: ctx.analytics.gasPriceWei, gasLimit: ctx.analytics.gasLimit, payloadHash: ctx.analytics.payloadHash } });
		metrics.jsonRpcRequestsTotal.labels(ctx.method, decision.decision, decision.rule || decision.reason).inc();
		if (decision.decision === 'block') {
			metrics.jsonRpcBlockedTotal.labels(ctx.method, decision.rule || decision.reason).inc();
			this.logger.warn('Blocking JSON-RPC', { method: ctx.method, clientIp, reason: decision.reason, rule: decision.rule, reqId: ctx.reqId });
			this.events.emit({ type: 'block', timestamp: Date.now(), method: ctx.method, clientIp, reason: decision.reason, rule: decision.rule, from: ctx.extracted.fromAddress, to: ctx.extracted.toAddress, reqId: ctx.reqId });
			return makeJsonRpcError(ctx.id, -32000, `Blocked by BAF: ${decision.reason}`, { reqId: ctx.reqId, rule: decision.rule });
		}
		this.events.emit({ type: 'allow', timestamp: Date.now(), method: ctx.method, clientIp, reason: 'allow', rule: decision.rule, from: ctx.extracted.fromAddress, to: ctx.extracted.toAddress, reqId: ctx.reqId });
		const end = metrics.jsonRpcForwardLatencyMs.startTimer();
		try {
			return await this.send(payload);
		} finally { end(); }
	}

	async send(payload: unknown): Promise<unknown> {
		return this.rpc.send(payload);
	}
}