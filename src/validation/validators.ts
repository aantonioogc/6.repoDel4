import { z } from 'zod';

export const jsonRpcRequestSchema = z.object({
	jsonrpc: z.string().default('2.0'),
	method: z.string(),
	params: z.array(z.unknown()).optional(),
	id: z.union([z.string(), z.number(), z.null()]).optional()
});

export type JsonRpcRequest = z.infer<typeof jsonRpcRequestSchema>;

export const jsonRpcBatchSchema = z.array(jsonRpcRequestSchema).min(1);

export function isBatch(payload: unknown): payload is JsonRpcRequest[] {
	return Array.isArray(payload);
}

export function validateJsonRpcSingle(payload: unknown): JsonRpcRequest {
	return jsonRpcRequestSchema.parse(payload);
}

export function validateJsonRpcBatchOrSingle(payload: unknown): JsonRpcRequest[] {
	if (Array.isArray(payload)) {
		return jsonRpcBatchSchema.parse(payload);
	}
	return [jsonRpcRequestSchema.parse(payload)];
}

export function makeJsonRpcError(id: unknown, code: number, message: string, data?: unknown) {
	return { jsonrpc: '2.0', id: id ?? null, error: { code, message, ...(data !== undefined ? { data } : {}) } };
}