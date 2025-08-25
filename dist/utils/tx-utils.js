"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRawTx = parseRawTx;
exports.extractTxAddresses = extractTxAddresses;
exports.extractRawTxFields = extractRawTxFields;
// src/utils/tx-utils.ts
const utils_1 = require("ethers/lib/utils");
/**
 * parseRawTx
 * Decodifica una raw transaction (hex) y devuelve un objeto con campos útiles.
 *
 * Compatible con ethers v5 (parseTransaction).
 */
function parseRawTx(raw) {
    try {
        const tx = (0, utils_1.parseTransaction)(raw); // ethers v5 compatible
        // Normalizaciones:
        // - nonce: si parseTransaction devuelve null -> usar 0 (más conveniente para tests)
        // - gasLimit/gasPrice/value: devolver como strings cuando existan
        const nonce = tx.nonce == null ? 0 : tx.nonce;
        const gasLimit = tx.gasLimit?.toString();
        const gasPrice = tx.gasPrice?.toString();
        const maxFeePerGas = tx.maxFeePerGas?.toString();
        const maxPriorityFeePerGas = tx.maxPriorityFeePerGas?.toString();
        const value = tx.value?.toString();
        return {
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            nonce,
            gasLimit,
            gasPrice,
            maxFeePerGas,
            maxPriorityFeePerGas,
            value,
            data: tx.data,
            // tx.type suele venir definido (0,1,2). Si no, intentar inferir: legacy -> 0
            type: tx.type == null ? (gasPrice ? 0 : undefined) : tx.type,
        };
    }
    catch (e) {
        throw new Error("Failed to parse raw transaction");
    }
}
exports.default = parseRawTx;
function extractTxAddresses(method, params) {
    try {
        if (!params || params.length === 0)
            return {};
        const m = method.toLowerCase();
        if (m === 'eth_sendrawtransaction') {
            const raw = params[0];
            if (typeof raw === 'string' && (0, utils_1.isHexString)(raw)) {
                try {
                    const tx = (0, utils_1.parseTransaction)(raw);
                    const from = tx.from?.toLowerCase();
                    const to = tx.to?.toLowerCase();
                    return { from, to };
                }
                catch (_e) {
                    return {};
                }
            }
            return {};
        }
        if (m === 'eth_sendtransaction') {
            const tx = params[0];
            const from = typeof tx?.from === 'string' ? tx.from : undefined;
            const to = typeof tx?.to === 'string' ? tx.to : undefined;
            return { from: from?.toLowerCase(), to: to?.toLowerCase() };
        }
        if (m === 'eth_call') {
            const call = params[0];
            const from = typeof call?.from === 'string' ? call.from : undefined;
            const to = typeof call?.to === 'string' ? call.to : undefined;
            return { from: from?.toLowerCase(), to: to?.toLowerCase() };
        }
        return {};
    }
    catch (_err) {
        return {};
    }
}
function extractRawTxFields(rawTx) {
    try {
        const tx = (0, utils_1.parseTransaction)(rawTx);
        return {
            from: tx.from?.toLowerCase(),
            to: tx.to?.toLowerCase(),
            nonce: tx.nonce == null ? 0 : tx.nonce,
            gasPrice: tx.gasPrice?.toString(),
            gasLimit: tx.gasLimit?.toString()
        };
    }
    catch (_e) {
        return {};
    }
}
//# sourceMappingURL=tx-utils.js.map