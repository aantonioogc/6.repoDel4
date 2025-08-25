"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseProvider = void 0;
const validators_1 = require("../validation/validators");
const tx_utils_1 = require("../utils/tx-utils");
const crypto_1 = __importDefault(require("crypto"));
class BaseProvider {
    constructor(logger) {
        this.logger = logger;
    }
    createReqId() {
        return crypto_1.default.randomUUID();
    }
    hashPayload(payload) {
        const raw = JSON.stringify(payload);
        return crypto_1.default.createHash('sha256').update(raw).digest('hex');
    }
    parseAndExtractSingle(payload, clientIp) {
        const req = (0, validators_1.validateJsonRpcSingle)(payload);
        const { from, to } = (0, tx_utils_1.extractTxAddresses)(req.method, req.params);
        let nonce;
        let gasPriceWei;
        let gasLimit;
        if (req.method.toLowerCase() === 'eth_sendrawtransaction' && req.params && typeof req.params[0] === 'string') {
            const raw = req.params[0];
            const fields = (0, tx_utils_1.extractRawTxFields)(raw);
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
    parseAndExtractBatch(payload, clientIp) {
        const reqs = (0, validators_1.validateJsonRpcBatchOrSingle)(payload);
        return reqs.map((req) => this.parseAndExtractSingle(req, clientIp));
    }
}
exports.BaseProvider = BaseProvider;
//# sourceMappingURL=base-provider.js.map