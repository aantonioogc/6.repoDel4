export interface RateLimiterStore {
	incrementAndGetCount(key: string, windowMs: number): Promise<number>;
}

export interface KeyValueStore<T = unknown> {
	get(key: string): Promise<T | undefined>;
	set(key: string, value: T, ttlMs?: number): Promise<void>;
	delete(key: string): Promise<void>;
}