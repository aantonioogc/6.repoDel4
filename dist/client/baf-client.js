"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BafClient = void 0;
const axios_1 = __importDefault(require("axios"));
class BafClient {
    constructor(rpcUrl) {
        this.rpcUrl = rpcUrl || process.env.BAF_RPC || "http://127.0.0.1:3000/rpc";
    }
    async sendRawTransaction(rawTx) {
        const payload = {
            jsonrpc: "2.0",
            id: Date.now(),
            method: "eth_sendRawTransaction",
            params: [rawTx],
        };
        try {
            const res = await axios_1.default.post(this.rpcUrl, payload);
            return res.data;
        }
        catch (e) {
            if (e.response?.data)
                return e.response.data;
            throw e;
        }
    }
    async getChainId() {
        const payload = {
            jsonrpc: "2.0",
            id: Date.now(),
            method: "eth_chainId",
            params: [],
        };
        try {
            const res = await axios_1.default.post(this.rpcUrl, payload);
            return res.data.result;
        }
        catch (e) {
            if (e.response?.data)
                return e.response.data;
            throw e;
        }
    }
    // Enviar raw transaction al BAF/nodo
    async sendRawTx(raw) {
        const { data } = await axios_1.default.post(this.rpcUrl, {
            jsonrpc: "2.0",
            id: Math.floor(Math.random() * 1e6),
            method: "eth_sendRawTransaction",
            params: [raw],
        });
        return data;
    }
}
exports.BafClient = BafClient;
//# sourceMappingURL=baf-client.js.map