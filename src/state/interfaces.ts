export interface RateLimiterStore {
	incrementAndGetCount(key: string, windowMs: number): Promise<number>;
	/**
	 * Add a member to a set with TTL and return the resulting set size.
	 * Used for Sybil checks (unique identities per window).
	 */
	addToSetAndGetSize?(key: string, member: string, ttlMs: number): Promise<number>;
}

export interface KeyValueStore<T = unknown> {
	get(key: string): Promise<T | undefined>;
	set(key: string, value: T, ttlMs?: number): Promise<void>;
	delete(key: string): Promise<void>;
}