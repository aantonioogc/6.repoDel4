"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirewallProvider = void 0;
const base_provider_1 = require("./base-provider");
const prometheus_1 = require("../metrics/prometheus");
const validators_1 = require("../validation/validators");
class FirewallProvider extends base_provider_1.BaseProvider {
    constructor(deps) {
        super(deps.logger);
        this.policy = deps.policy;
        this.rpc = deps.rpc;
        this.events = deps.events;
    }
    async handleJsonRpc(payload, clientIp) {
        if ((0, validators_1.isBatch)(payload)) {
            const ctxs = payload.map((p) => this.parseAndExtractSingle(p, clientIp));
            const results = await Promise.all(ctxs.map(async (ctx) => {
                const decision = await this.policy.evaluate({ method: ctx.method, params: ctx.params, clientIp: ctx.clientIp, extracted: { from: ctx.extracted.fromAddress, to: ctx.extracted.toAddress, nonce: ctx.extracted.nonce, gasPriceWei: ctx.analytics.gasPriceWei, gasLimit: ctx.analytics.gasLimit, payloadHash: ctx.analytics.payloadHash } });
                prometheus_1.metrics.jsonRpcRequestsTotal.labels(ctx.method, decision.decision, decision.rule || decision.reason).inc();
                if (decision.decision === 'block') {
                    prometheus_1.metrics.jsonRpcBlockedTotal.labels(ctx.method, decision.rule || decision.reason).inc();
                    this.logger.warn('Blocking JSON-RPC (batch)', { method: ctx.method, clientIp, reason: decision.reason, rule: decision.rule, reqId: ctx.reqId });
                    this.events.emit({ type: 'block', timestamp: Date.now(), method: ctx.method, clientIp, reason: decision.reason, rule: decision.rule, from: ctx.extracted.fromAddress, to: ctx.extracted.toAddress, reqId: ctx.reqId });
                    return (0, validators_1.makeJsonRpcError)(ctx.id, -32000, `Blocked by BAF: ${decision.reason}`, { reqId: ctx.reqId, rule: decision.rule });
                }
                this.events.emit({ type: 'allow', timestamp: Date.now(), method: ctx.method, clientIp, reason: 'allow', rule: decision.rule, from: ctx.extracted.fromAddress, to: ctx.extracted.toAddress, reqId: ctx.reqId });
                return null;
            }));
            const toForward = ctxs.map((c, i) => (results[i] === null ? payload[i] : null));
            let forwarded = [];
            if (toForward.some((x) => x !== null)) {
                const forwardPayload = (toForward.filter((x) => x !== null));
                const end = prometheus_1.metrics.jsonRpcForwardLatencyMs.startTimer();
                try {
                    const data = await this.send(forwardPayload);
                    forwarded = Array.isArray(data) ? data : [data];
                }
                finally {
                    end();
                }
            }
            const merged = [];
            let fIdx = 0;
            for (let i = 0; i < results.length; i++) {
                if (results[i] !== null)
                    merged.push(results[i]);
                else {
                    merged.push(forwarded[fIdx++] ?? (0, validators_1.makeJsonRpcError)(ctxs[i].id, -32603, 'Internal error', { reqId: ctxs[i].reqId }));
                }
            }
            return merged;
        }
        const ctx = this.parseAndExtractSingle(payload, clientIp);
        const decision = await this.policy.evaluate({ method: ctx.method, params: ctx.params, clientIp: ctx.clientIp, extracted: { from: ctx.extracted.fromAddress, to: ctx.extracted.toAddress, nonce: ctx.extracted.nonce, gasPriceWei: ctx.analytics.gasPriceWei, gasLimit: ctx.analytics.gasLimit, payloadHash: ctx.analytics.payloadHash } });
        prometheus_1.metrics.jsonRpcRequestsTotal.labels(ctx.method, decision.decision, decision.rule || decision.reason).inc();
        if (decision.decision === 'block') {
            prometheus_1.metrics.jsonRpcBlockedTotal.labels(ctx.method, decision.rule || decision.reason).inc();
            this.logger.warn('Blocking JSON-RPC', { method: ctx.method, clientIp, reason: decision.reason, rule: decision.rule, reqId: ctx.reqId });
            this.events.emit({ type: 'block', timestamp: Date.now(), method: ctx.method, clientIp, reason: decision.reason, rule: decision.rule, from: ctx.extracted.fromAddress, to: ctx.extracted.toAddress, reqId: ctx.reqId });
            return (0, validators_1.makeJsonRpcError)(ctx.id, -32000, `Blocked by BAF: ${decision.reason}`, { reqId: ctx.reqId, rule: decision.rule });
        }
        this.events.emit({ type: 'allow', timestamp: Date.now(), method: ctx.method, clientIp, reason: 'allow', rule: decision.rule, from: ctx.extracted.fromAddress, to: ctx.extracted.toAddress, reqId: ctx.reqId });
        const end = prometheus_1.metrics.jsonRpcForwardLatencyMs.startTimer();
        try {
            return await this.send(payload);
        }
        finally {
            end();
        }
    }
    async send(payload) {
        return this.rpc.send(payload);
    }
}
exports.FirewallProvider = FirewallProvider;
//# sourceMappingURL=firewall-provider.js.map