import Redis from 'ioredis';
import { KeyValueStore, RateLimiterStore } from './interfaces';

export class RedisStores implements RateLimiterStore, KeyValueStore<string> {
	private client: Redis;

	constructor(url?: string) {
		this.client = new Redis(url || process.env.REDIS_URL || 'redis://localhost:6379');
	}

	async incrementAndGetCount(key: string, windowMs: number): Promise<number> {
		const ttlSeconds = Math.ceil(windowMs / 1000);
		const multi = this.client.multi();
		multi.incr(key);
		multi.expire(key, ttlSeconds, 'NX');
		const [count] = (await multi.exec()) as [number, unknown];
		return Number(count);
	}

	async get(key: string): Promise<string | undefined> {
		const v = await this.client.get(key);
		return v === null ? undefined : v;
	}

	async set(key: string, value: string, ttlMs?: number): Promise<void> {
		if (ttlMs && ttlMs > 0) {
			await this.client.set(key, value, 'PX', ttlMs);
		} else {
			await this.client.set(key, value);
		}
	}

	async delete(key: string): Promise<void> {
		await this.client.del(key);
	}
}