// scripts/12_sybil_generator.js
// Node ESM script — requiere package.json { "type": "module" }
// Ejecutar: BAF_RPC=http://localhost:8545 FAUCET_PK=<privkey> node scripts/12_sybil_generator.js

import { Wallet, JsonRpcProvider } from "ethers";
import PQueue from "p-queue";

const RPC = process.env.BAF_RPC || "http://127.0.0.1:8545";
const FAUCET_PK = process.env.FAUCET_PK;
if (!FAUCET_PK) {
  console.error("ERROR: define FAUCET_PK env var (privkey with funds on the testnet).");
  process.exit(1);
}

const provider = new JsonRpcProvider(RPC);
const faucet = new Wallet(FAUCET_PK, provider);

const N_WALLETS = Number(process.env.N_WALLETS || 200);        // número de identidades/sybils
const TXS_PER_WALLET = Number(process.env.TXS_PER_WALLET || 5); // transacciones por identidad
const CONCURRENCY = Number(process.env.CONCURRENCY || 200);     // concurrencia en envíos
const FUND_AMOUNT = process.env.FUND_AMOUNT || "0.1";           // ETH a enviar a cada wallet

async function main() {
  console.log(`Provider RPC: ${RPC}`);
  console.log(`Generating ${N_WALLETS} wallets...`);

  const wallets = Array.from({ length: N_WALLETS }).map(() => Wallet.createRandom().connect(provider));

  // 1) Fund wallets from faucet
  console.log("Funding wallets from faucet...");
  for (const w of wallets) {
    try {
      const tx = await faucet.sendTransaction({
        to: w.address,
        value: ethers.parseEther(FUND_AMOUNT),
        gasLimit: 21000
      });
      await tx.wait();
    } catch (err) {
      console.error("Funding error:", err.message || err);
    }
  }
  console.log("Funding done.");

  // 2) Create queue to send many txs concurrently
  const queue = new PQueue({ concurrency: CONCURRENCY });

  console.log(`Sending ${TXS_PER_WALLET} txs per wallet (total ${TXS_PER_WALLET * N_WALLETS})...`);
  let count = 0;
  for (const w of wallets) {
    for (let i = 0; i < TXS_PER_WALLET; i++) {
      queue.add(async () => {
        try {
          const tx = await w.sendTransaction({
            to: w.address,            // self-send (cheap) or to random address
            value: 1n,                // small value in wei to minimize cost
            gasLimit: 21000
          });
          await tx.wait();
          count++;
          if (count % 100 === 0) console.log("sent", count, "txs");
        } catch (err) {
          // Could be rejected by BAF — log reason if present
          console.error("tx err:", err?.reason || err?.message || JSON.stringify(err));
        }
      });
    }
  }

  await queue.onIdle();
  console.log("All txs enqueued and sent or failed. Total attempted:", N_WALLETS * TXS_PER_WALLET);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
