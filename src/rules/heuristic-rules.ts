import { RuleConfig, RuleResult } from './types';
import { RateLimiterStore } from '../state/interfaces';

export class HeuristicRules {
	private readonly cfg: RuleConfig;
	private readonly rateStore: RateLimiterStore;

	constructor(cfg: RuleConfig, rateStore: RateLimiterStore) {
		this.cfg = cfg;
		this.rateStore = rateStore;
	}

	async evaluate(ctx: { method: string; clientIp: string; from?: string; payloadHash?: string; nonce?: number }): Promise<RuleResult | null> {
		const rateCfg = this.cfg.heuristics.rateLimit;
		const windowMs = Math.max(1, rateCfg?.windowSeconds ?? 10) * 1000;

		// Per-IP TPS
		if (rateCfg?.perIpTps && rateCfg.perIpTps > 0) {
			const ipKey = `rate:ip:${ctx.clientIp}`;
			const ipCount = await this.rateStore.incrementAndGetCount(ipKey, windowMs);
			if (ipCount > rateCfg.perIpTps * (windowMs / 1000)) {
				return { decision: 'block', reason: 'rate_limit_ip', rule: 'heuristics.rateLimit.perIpTps', tags: ['heuristic', 'ip'] };
			}
		}

		// Per-address TPS (from)
		if (ctx.from && rateCfg?.perAddressTps && rateCfg.perAddressTps > 0) {
			const addrKey = `rate:addr:${ctx.from.toLowerCase()}`;
			const addrCount = await this.rateStore.incrementAndGetCount(addrKey, windowMs);
			if (addrCount > rateCfg.perAddressTps * (windowMs / 1000)) {
				return { decision: 'block', reason: 'rate_limit_address', rule: 'heuristics.rateLimit.perAddressTps', tags: ['heuristic', 'address'] };
			}
		}

		// Per-method per-IP bursts
		if (rateCfg?.perMethodPerIpTps && rateCfg.perMethodPerIpTps > 0) {
			const methodKey = `rate:ipmethod:${ctx.clientIp}:${ctx.method.toLowerCase()}`;
			const methodCount = await this.rateStore.incrementAndGetCount(methodKey, windowMs);
			if (methodCount > rateCfg.perMethodPerIpTps * (windowMs / 1000)) {
				return { decision: 'block', reason: 'rate_limit_method_burst', rule: 'heuristics.rateLimit.perMethodPerIpTps', tags: ['heuristic', 'method'] };
			}
		}

		// Fingerprint identical payloads per IP window
		if (this.cfg.heuristics.fingerprintWindowSeconds && this.cfg.heuristics.fingerprintMaxRepeats && ctx.payloadHash) {
			const fpWindowMs = this.cfg.heuristics.fingerprintWindowSeconds * 1000;
			const fpKey = `fp:${ctx.clientIp}:${ctx.payloadHash}`;
			const fpCount = await this.rateStore.incrementAndGetCount(fpKey, fpWindowMs);
			if (fpCount > this.cfg.heuristics.fingerprintMaxRepeats) {
				return { decision: 'block', reason: 'repeated_payload', rule: 'heuristics.fingerprint', tags: ['heuristic', 'fingerprint'] };
			}
		}

		// Duplicate nonce anomalies per address window
		if (ctx.from && typeof ctx.nonce === 'number' && this.cfg.heuristics.nonceAnomalyWindowSeconds && this.cfg.heuristics.maxDuplicateNoncesPerWindow) {
			const nonceWindowMs = this.cfg.heuristics.nonceAnomalyWindowSeconds * 1000;
			const dupKey = `nonce:${ctx.from.toLowerCase()}:${ctx.nonce}`;
			const dupCount = await this.rateStore.incrementAndGetCount(dupKey, nonceWindowMs);
			if (dupCount > this.cfg.heuristics.maxDuplicateNoncesPerWindow) {
				return { decision: 'block', reason: 'duplicate_nonce', rule: 'heuristics.nonceAnomaly', tags: ['heuristic', 'nonce'] };
			}
		}

		return null;
	}
}