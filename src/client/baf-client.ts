import axios from "axios";

export class BafClient {
  private rpcUrl: string;

  constructor(rpcUrl?: string) {
    this.rpcUrl = rpcUrl || process.env.BAF_RPC || "http://127.0.0.1:3000/rpc";
  }

  async sendRawTransaction(rawTx: string) {
    const payload = {
      jsonrpc: "2.0",
      id: Date.now(),
      method: "eth_sendRawTransaction",
      params: [rawTx],
    };

    try {
      const res = await axios.post(this.rpcUrl, payload);
      return res.data;
    } catch (e: any) {
      if (e.response?.data) return e.response.data;
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
      const res = await axios.post(this.rpcUrl, payload);
      return res.data.result;
    } catch (e: any) {
      if (e.response?.data) return e.response.data;
      throw e;
    }
  }

   // Enviar raw transaction al BAF/nodo
  async sendRawTx(raw: string) {
    const { data } = await axios.post(this.rpcUrl, {
      jsonrpc: "2.0",
      id: Math.floor(Math.random() * 1e6),
      method: "eth_sendRawTransaction",
      params: [raw],
    });
    return data;
  }
}
