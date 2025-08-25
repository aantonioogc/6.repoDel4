import { RuleConfig } from './types';

export class RuleConfigStore {
	private cfg: RuleConfig;

	constructor(initial: RuleConfig) {
		this.cfg = JSON.parse(JSON.stringify(initial));
	}

	get(): RuleConfig {
		return this.cfg;
	}

	update(partial: Partial<RuleConfig>): void {
		this.cfg = { ...this.cfg, ...partial, static: { ...this.cfg.static, ...(partial.static || {}) }, heuristics: { ...this.cfg.heuristics, ...(partial.heuristics || {}) }, reputation: { ...this.cfg.reputation, ...(partial.reputation || {}) } };
	}

	addBlockedAddress(addr: string): void {
		const a = addr.toLowerCase();
		const cur = new Set(this.cfg.static.blockedAddresses || []);
		cur.add(a);
		this.cfg.static.blockedAddresses = Array.from(cur);
	}

	removeBlockedAddress(addr: string): void {
		const a = addr.toLowerCase();
		this.cfg.static.blockedAddresses = (this.cfg.static.blockedAddresses || []).filter((x) => x !== a);
	}

	setAllowedMethods(methods: string[]): void {
		this.cfg.static.allowedMethods = methods.map((m) => m.toLowerCase());
	}

	setBlockedMethods(methods: string[]): void {
		this.cfg.static.blockedMethods = methods.map((m) => m.toLowerCase());
	}
}