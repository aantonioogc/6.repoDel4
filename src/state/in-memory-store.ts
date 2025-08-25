import { KeyValueStore, RateLimiterStore } from './interfaces';

export class InMemoryKeyValueStore<T = unknown> implements KeyValueStore<T> {
	private store = new Map<string, { value: T; expiresAt?: number }>();

	async get(key: string): Promise<T | undefined> {
		const entry = this.store.get(key);
		if (!entry) return undefined;
		if (entry.expiresAt && entry.expiresAt < Date.now()) {
			this.store.delete(key);
			return undefined;
		}
		return entry.value;
	}

	async set(key: string, value: T, ttlMs?: number): Promise<void> {
		const expiresAt = ttlMs ? Date.now() + ttlMs : undefined;
		this.store.set(key, { value, expiresAt });
	}

	async delete(key: string): Promise<void> {
		this.store.delete(key);
	}
}

export class InMemoryRateLimiterStore implements RateLimiterStore {
	private counters = new Map<string, { count: number; windowEndsAt: number }>();
	private sets = new Map<string, { members: Set<string>; expiresAt: number }>();

	async incrementAndGetCount(key: string, windowMs: number): Promise<number> {
		const now = Date.now();
		const cur = this.counters.get(key);
		if (!cur || cur.windowEndsAt <= now) {
			const next = { count: 1, windowEndsAt: now + windowMs };
			this.counters.set(key, next);
			return next.count;
		}
		cur.count += 1;
		return cur.count;
	}

	async addToSetAndGetSize(key: string, member: string, ttlMs: number): Promise<number> {
		const now = Date.now();
		let entry = this.sets.get(key);
		if (!entry || entry.expiresAt <= now) {
			entry = { members: new Set<string>(), expiresAt: now + ttlMs };
			this.sets.set(key, entry);
		}
		entry.members.add(member);
		return entry.members.size;
	}
}