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
		const [countReply] = (await multi.exec()) as [unknown, unknown];
		const count = Array.isArray(countReply) ? Number(countReply[1]) : Number(countReply);
		return Number.isFinite(count) ? count : 0;
	}

	async addToSetAndGetSize(key: string, member: string, ttlMs: number): Promise<number> {
		const ttlSeconds = Math.ceil(ttlMs / 1000);
		const multi = this.client.multi();
		multi.sadd(key, member);
		multi.expire(key, ttlSeconds, 'NX');
		multi.scard(key);
		const replies = await multi.exec();
		const scardReply = replies && replies[2] && (Array.isArray(replies[2]) ? replies[2][1] : replies[2]);
		return Number(scardReply) || 0;
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