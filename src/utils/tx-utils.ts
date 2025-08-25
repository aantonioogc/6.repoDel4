// src/utils/tx-utils.ts
import { isHexString, parseTransaction } from 'ethers/lib/utils';

export interface ExtractedRawTxFields {
  from?: string;
  nonce?: number;
  gasPrice?: string; // hex or decimal string
  gasLimit?: string;
  to?: string;
}

/**
 * parseRawTx
 * Decodifica una raw transaction (hex) y devuelve un objeto con campos útiles.
 *
 * Compatible con ethers v5 (parseTransaction).
 */
export function parseRawTx(raw: string) {
  try {
    const tx = parseTransaction(raw); // ethers v5 compatible

    // Normalizaciones:
    // - nonce: si parseTransaction devuelve null -> usar 0 (más conveniente para tests)
    // - gasLimit/gasPrice/value: devolver como strings cuando existan
    const nonce = tx.nonce == null ? 0 : tx.nonce;
    const gasLimit = tx.gasLimit?.toString();
    const gasPrice = tx.gasPrice?.toString();
    const maxFeePerGas = (tx as any).maxFeePerGas?.toString();
    const maxPriorityFeePerGas = (tx as any).maxPriorityFeePerGas?.toString();
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
  } catch (e: any) {
    throw new Error("Failed to parse raw transaction");
  }
}

export default parseRawTx;

export function extractTxAddresses(method: string, params: unknown[] | undefined): { from?: string; to?: string } {
  try {
    if (!params || params.length === 0) return {};
    const m = method.toLowerCase();
    if (m === 'eth_sendrawtransaction') {
      const raw = params[0];
      if (typeof raw === 'string' && isHexString(raw)) {
        try {
          const tx = parseTransaction(raw);
          const from = tx.from?.toLowerCase();
          const to = tx.to?.toLowerCase();
          return { from, to };
        } catch (_e) {
          return {};
        }
      }
      return {};
    }
    if (m === 'eth_sendtransaction') {
      const tx = params[0] as Record<string, unknown>;
      const from = typeof tx?.from === 'string' ? (tx.from as string) : undefined;
      const to = typeof tx?.to === 'string' ? (tx.to as string) : undefined;
      return { from: from?.toLowerCase(), to: to?.toLowerCase() };
    }
    if (m === 'eth_call') {
      const call = params[0] as Record<string, unknown>;
      const from = typeof call?.from === 'string' ? (call.from as string) : undefined;
      const to = typeof call?.to === 'string' ? (call.to as string) : undefined;
      return { from: from?.toLowerCase(), to: to?.toLowerCase() };
    }
    return {};
  } catch (_err) {
    return {};
  }
}

export function extractRawTxFields(rawTx: string): ExtractedRawTxFields {
  try {
    const tx = parseTransaction(rawTx);
    return {
      from: tx.from?.toLowerCase(),
      to: tx.to?.toLowerCase(),
      nonce: tx.nonce == null ? 0 : tx.nonce,
      gasPrice: tx.gasPrice?.toString(),
      gasLimit: tx.gasLimit?.toString()
    };
  } catch (_e) {
    return {};
  }
}
