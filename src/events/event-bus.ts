import { Response } from 'express';

export type BafEvent = { type: 'block' | 'allow'; timestamp: number; rule?: string; reason?: string; method: string; clientIp: string; from?: string; to?: string; reqId: string };

export class EventBus {
	private subscribers: Set<Response> = new Set();

	subscribe(res: Response) {
		this.subscribers.add(res);
		res.on('close', () => this.subscribers.delete(res));
	}

	emit(event: BafEvent) {
		const line = `data: ${JSON.stringify(event)}\n\n`;
		for (const s of this.subscribers) {
			try { s.write(line); } catch { /* ignore */ }
		}
	}
}