"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RpcClient = void 0;
const axios_1 = __importDefault(require("axios"));
class RpcClient {
    constructor(opts) {
        this.http = axios_1.default.create({
            baseURL: opts.upstreamUrl,
            timeout: opts.timeoutMs ?? 10000,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    async send(payload) {
        const { data } = await this.http.post('', payload);
        return data;
    }
}
exports.RpcClient = RpcClient;
//# sourceMappingURL=rpc-client.js.map