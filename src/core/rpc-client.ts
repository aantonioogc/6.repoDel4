import axios, { AxiosInstance } from 'axios';

export interface RpcClientOptions {
	upstreamUrl: string;
	timeoutMs?: number;
}

export class RpcClient {
	private readonly http: AxiosInstance;

	constructor(opts: RpcClientOptions) {
		this.http = axios.create({
			baseURL: opts.upstreamUrl,
			timeout: opts.timeoutMs ?? 10_000,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	async send(payload: unknown): Promise<unknown> {
		const { data } = await this.http.post('', payload);
		return data;
	}
}