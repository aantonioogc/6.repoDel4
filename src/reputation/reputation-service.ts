import { KeyValueStore } from '../state/interfaces';
import { ReputationConfig } from '../rules/types';

export type SubjectType = 'address' | 'ip';

export class ReputationService {
	private readonly store: KeyValueStore<number>;
	private readonly cfg: ReputationConfig;

	constructor(store: KeyValueStore<number>, cfg?: ReputationConfig) {
		this.store = store;
		this.cfg = cfg || { initialScore: 100, minScoreToAllow: 0, penaltyBlocked: 5, rewardAllowed: 1 };
	}

	private key(type: SubjectType, id: string): string {
		return `rep:${type}:${id}`;
	}

	async getScore(type: SubjectType, id: string): Promise<number> {
		const v = await this.store.get(this.key(type, id));
		if (typeof v === 'number') return v;
		return this.cfg.initialScore ?? 100;
	}

	async adjustScore(type: SubjectType, id: string, delta: number): Promise<number> {
		const cur = await this.getScore(type, id);
		const next = cur + delta;
		await this.store.set(this.key(type, id), next);
		return next;
	}

	async shouldAllow(type: SubjectType, id: string): Promise<boolean> {
		const score = await this.getScore(type, id);
		const min = this.cfg.minScoreToAllow ?? 0;
		return score >= min;
	}

	getConfig() { return this.cfg; }
}