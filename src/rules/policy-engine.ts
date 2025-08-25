import { RuleResult } from './types';
import { evaluateStaticRules } from './static-rules';
import { HeuristicRules } from './heuristic-rules';
import { RateLimiterStore } from '../state/interfaces';
import { RuleConfigStore } from './config-store';

export class PolicyEngine {
	private readonly store: RuleConfigStore;
	private readonly heuristics: HeuristicRules;

	constructor(store: RuleConfigStore, rateStore: RateLimiterStore) {
		this.store = store;
		this.heuristics = new HeuristicRules(this.store.get(), rateStore);
	}

	async evaluate(ctx: { method: string; params: unknown[] | undefined; clientIp: string; extracted: { from?: string; to?: string; nonce?: number; gasPriceWei?: bigint; gasLimit?: bigint; payloadHash?: string } }): Promise<RuleResult> {
		const cfg = this.store.get();
		const staticRes = evaluateStaticRules(cfg, { method: ctx.method, from: ctx.extracted.from, to: ctx.extracted.to, gasPriceWei: ctx.extracted.gasPriceWei, gasLimit: ctx.extracted.gasLimit });
		if (staticRes) return staticRes;

		const heur = new HeuristicRules(cfg, (this.heuristics as any)['rateStore']);
		const heurRes = await heur.evaluate({ method: ctx.method, clientIp: ctx.clientIp, from: ctx.extracted.from, payloadHash: ctx.extracted.payloadHash, nonce: ctx.extracted.nonce });
		if (heurRes) return heurRes;

		return { decision: 'allow', reason: 'default_allow', rule: 'default' };
	}
}