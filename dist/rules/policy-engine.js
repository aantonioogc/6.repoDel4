"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyEngine = void 0;
const static_rules_1 = require("./static-rules");
const heuristic_rules_1 = require("./heuristic-rules");
class PolicyEngine {
    constructor(store, rateStore) {
        this.store = store;
        this.heuristics = new heuristic_rules_1.HeuristicRules(this.store.get(), rateStore);
    }
    async evaluate(ctx) {
        const cfg = this.store.get();
        const staticRes = (0, static_rules_1.evaluateStaticRules)(cfg, { method: ctx.method, from: ctx.extracted.from, to: ctx.extracted.to, gasPriceWei: ctx.extracted.gasPriceWei, gasLimit: ctx.extracted.gasLimit });
        if (staticRes)
            return staticRes;
        const heur = new heuristic_rules_1.HeuristicRules(cfg, this.heuristics['rateStore']);
        const heurRes = await heur.evaluate({ method: ctx.method, clientIp: ctx.clientIp, from: ctx.extracted.from, payloadHash: ctx.extracted.payloadHash, nonce: ctx.extracted.nonce });
        if (heurRes)
            return heurRes;
        return { decision: 'allow', reason: 'default_allow', rule: 'default' };
    }
}
exports.PolicyEngine = PolicyEngine;
//# sourceMappingURL=policy-engine.js.map