import { Logger } from 'winston';
import { validateJsonRpcSingle, validateJsonRpcBatchOrSingle } from '../validation/validators';
import { extractTxAddresses, extractRawTxFields } from '../utils/tx-utils';
import crypto from 'crypto';

export abstract class BaseProvider {
	protected readonly logger: Logger;
	constructor(logger: Logger) {
		this.logger = logger;
	}

	protected createReqId(): string {
		return crypto.randomUUID();
	}

	protected hashPayload(payload: unknown): string {
		const raw = JSON.stringify(payload);
		return crypto.createHash('sha256').update(raw).digest('hex');
	}

	protected parseAndExtractSingle(payload: unknown, clientIp: string) {
		const req = validateJsonRpcSingle(payload);
		const { from, to } = extractTxAddresses(req.method, req.params);
		let nonce: number | undefined;
		let gasPriceWei: bigint | undefined;
		let gasLimit: bigint | undefined;
		if (req.method.toLowerCase() === 'eth_sendrawtransaction' && req.params && typeof req.params[0] === 'string') {
			const raw = req.params[0] as string;
			const fields = extractRawTxFields(raw);
			nonce = fields.nonce;
			gasPriceWei = fields.gasPrice ? BigInt(fields.gasPrice) : undefined;
			gasLimit = fields.gasLimit ? BigInt(fields.gasLimit) : undefined;
		}
		const reqId = this.createReqId();
		const payloadHash = this.hashPayload(req);
		return {
			jsonrpc: req.jsonrpc,
			method: req.method,
			params: req.params,
			id: req.id,
			clientIp,
			reqId,
			extracted: { fromAddress: from, toAddress: to, nonce, gasPrice: gasPriceWei?.toString(), gasLimit: gasLimit?.toString() },
			analytics: { gasPriceWei, gasLimit, payloadHash }
		};
	}

	protected parseAndExtractBatch(payload: unknown, clientIp: string) {
		const reqs = validateJsonRpcBatchOrSingle(payload);
		return reqs.map((req) => this.parseAndExtractSingle(req, clientIp));
	}

	abstract send(payload: unknown): Promise<unknown>;
}