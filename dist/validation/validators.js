"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsonRpcBatchSchema = exports.jsonRpcRequestSchema = void 0;
exports.isBatch = isBatch;
exports.validateJsonRpcSingle = validateJsonRpcSingle;
exports.validateJsonRpcBatchOrSingle = validateJsonRpcBatchOrSingle;
exports.makeJsonRpcError = makeJsonRpcError;
const zod_1 = require("zod");
exports.jsonRpcRequestSchema = zod_1.z.object({
    jsonrpc: zod_1.z.string().default('2.0'),
    method: zod_1.z.string(),
    params: zod_1.z.array(zod_1.z.unknown()).optional(),
    id: zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.null()]).optional()
});
exports.jsonRpcBatchSchema = zod_1.z.array(exports.jsonRpcRequestSchema).min(1);
function isBatch(payload) {
    return Array.isArray(payload);
}
function validateJsonRpcSingle(payload) {
    return exports.jsonRpcRequestSchema.parse(payload);
}
function validateJsonRpcBatchOrSingle(payload) {
    if (Array.isArray(payload)) {
        return exports.jsonRpcBatchSchema.parse(payload);
    }
    return [exports.jsonRpcRequestSchema.parse(payload)];
}
function makeJsonRpcError(id, code, message, data) {
    return { jsonrpc: '2.0', id: id ?? null, error: { code, message, ...(data !== undefined ? { data } : {}) } };
}
//# sourceMappingURL=validators.js.map