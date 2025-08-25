// scripts/10_mempool_spam.test.js
// Simula mempool flooding y reporta cómo responde el BAF.
//
// Uso:
//   BAF_RPC=http://127.0.0.1:3000/rpc FAUCET_PK=<privkey> node scripts/10_mempool_spam.test.js
//
// Nota: FAUCET_PK es necesario para fundear N_KEYS cuentas si quieres que las tx tengan fondos.
// Si ya tienes cuentas pre-fundadas, puedes omitir el fund step y pasar FAUCET_SKIP=1.

const { Wallet, providers, utils } = require('ethers');
const axios = require('axios');
let PQueue; // cargaremos dinámicamente dentro de run()

const BAF_RPC = process.env.BAF_RPC || 'http://127.0.0.1:3000/rpc';
const provider = new providers.JsonRpcProvider(BAF_RPC); // provider apuntando al BAF (proxy)
const http = axios.create({ baseURL: BAF_RPC, timeout: 15000 });

// Config (ajusta según tu máquina)
const N_KEYS = Number(process.env.MSP_KEYS || 30);         // cuántas cuentas
const TXS_PER_KEY = Number(process.env.MSP_TXS || 100);   // cuántas txs por cuenta
const CONCURRENCY = Number(process.env.MSP_CONC || 200);  // concurrencia total (tareas)
const FUND_AMOUNT = process.env.MSP_FUND_AMOUNT || '1.0'; // ETH a enviar desde faucet por cuenta
const FAUCET_PK = process.env.FAUCET_PK;                  // private key que tiene fondos (opcional)
const FAUCET_SKIP = process.env.FAUCET_SKIP === '1';      // si true no se fundean cuentas

async function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

async function fundWallets(faucet, wallets){
  console.log(`[mempool] funding ${wallets.length} wallets with ${FUND_AMOUNT} ETH each from faucet ${faucet.address}...`);
  const amount = utils.parseEther(FUND_AMOUNT);
  // send one by one to avoid nonce problems
  for (const w of wallets){
    const tx = await faucet.sendTransaction({ to: w.address, value: amount });
    await tx.wait(1);
  }
  console.log('[mempool] funding done.');
}

function makeRandomWallets(n){
  const wallets = [];
  for (let i=0;i<n;i++){
    wallets.push(Wallet.createRandom());
  }
  return wallets;
}

async function run(){
  console.log('[mempool] BAF RPC =', BAF_RPC);
  console.log(`[mempool] parameters: N_KEYS=${N_KEYS}, TXS_PER_KEY=${TXS_PER_KEY}, CONCURRENCY=${CONCURRENCY}`);

  // create wallets (local keys)
  const wallets = makeRandomWallets(N_KEYS);

  // fund them if FAUCET_PK present and not skipped
  let faucet;
  if (!FAUCET_SKIP) {
    if (!FAUCET_PK) {
      console.log('[mempool] WARNING: no FAUCET_PK provided and FAUCET_SKIP!=1 — txs may fail with insufficient funds');
    } else {
      faucet = new Wallet(FAUCET_PK, provider);
      await fundWallets(faucet, wallets.map(w=>w.connect(provider)));
      // small delay to ensure chain processed
      await sleep(500);
    }
  } else {
    console.log('[mempool] skipping funding step (FAUCET_SKIP=1)');
  }

  // connect wallets to provider for signing/sending (Wallet.connect(provider) returns a Signer)
  const signers = wallets.map(w => w.connect(provider));

  // prepare stats
  const stats = {
    total: 0,
    accepted: 0,
    blocked: 0,
    rate_limited: 0,
    insufficient_funds: 0,
    chainid_mismatch: 0,
    replay_protection: 0,
    raw_too_large: 0,
    other_errors: {},
  };

  // cargar p-queue dinámicamente (ESM) en tiempo de ejecución
  PQueue = (await import('p-queue')).default;
  const queue = new PQueue({ concurrency: CONCURRENCY });

  // track nonces per signer to avoid nonce collisions; fetch initial nonce
  const nonces = {};
  for (const s of signers){
    try {
      const n = await provider.getTransactionCount(s.address);
      nonces[s.address] = n;
    } catch (e) {
      nonces[s.address] = 0;
    }
  }

  console.log('[mempool] starting flood...');

  for (const s of signers){
    for (let i=0;i<TXS_PER_KEY;i++){
      queue.add(async () => {
        stats.total += 1;

        const nonce = nonces[s.address]++;
        const tx = {
          to: s.address,      // self-send (keeps gas cheap)
          value: 1,           // 1 wei
          gasLimit: 21000,
          nonce,
        };

        // sign raw tx and send via raw RPC to ensure BAF sees eth_sendRawTransaction
        try {
          const raw = await s.signTransaction(tx);
          // send via axios to BAF endpoint (expects /rpc)
          const payload = { jsonrpc: '2.0', id: Date.now(), method: 'eth_sendRawTransaction', params: [raw] };
          try {
            const r = await http.post('', payload);
            const data = r.data;
            if (data.error) {
              // count error types
              const msg = String(data.error.message || data.error).toLowerCase();
              stats.blocked++;
              if (msg.includes('insufficient')) stats.insufficient_funds++;
              else if (msg.includes('chainid') || msg.includes('chain id')) stats.chainid_mismatch++;
              else if (msg.includes('replay')) stats.replay_protection++;
              else if (msg.includes('raw_tx_too_large') || msg.includes('too large')) stats.raw_too_large++;
              else if (r.status === 429 || msg.includes('rate_limit')) stats.rate_limited++;
              else stats.other_errors[msg] = (stats.other_errors[msg] || 0) + 1;
            } else if (data.result) {
              stats.accepted++;
            } else {
              stats.other_errors['unknown_response'] = (stats.other_errors['unknown_response']||0)+1;
            }
          } catch (errHttp) {
            // axios error (network/timeout or 4xx/5xx)
            const resp = errHttp.response;
            if (resp) {
              // server responded with status
              if (resp.status === 429) {
                stats.rate_limited++;
                stats.blocked++;
              } else if (resp.status === 403) {
                stats.blocked++;
                const msg = (resp.data && (resp.data.error || resp.data.message)) || String(resp.data);
                const lm = String(msg).toLowerCase();
                if (lm.includes('replay')) stats.replay_protection++;
                else if (lm.includes('chainid')) stats.chainid_mismatch++;
                else if (lm.includes('raw_tx_too_large')) stats.raw_too_large++;
                else stats.other_errors[lm] = (stats.other_errors[lm] || 0) + 1;
              } else {
                stats.other_errors[`http_${resp.status}`] = (stats.other_errors[`http_${resp.status}`] || 0) + 1;
              }
            } else {
              // network/timeout
              stats.other_errors['network'] = (stats.other_errors['network']||0)+1;
            }
          }
        } catch (signErr) {
          stats.other_errors['sign'] = (stats.other_errors['sign']||0) + 1;
        }
      });
    }
  }

  await queue.onIdle();

  console.log('--- MEMPOOL SPAM REPORT ---');
  console.log('total tasks:', stats.total);
  console.log('accepted:', stats.accepted);
  console.log('blocked:', stats.blocked);
  console.log(' rate_limited:', stats.rate_limited);
  console.log(' insufficient_funds:', stats.insufficient_funds);
  console.log(' chainid_mismatch:', stats.chainid_mismatch);
  console.log(' replay_protection:', stats.replay_protection);
  console.log(' raw_too_large:', stats.raw_too_large);
  console.log(' other_errors:', stats.other_errors);

  // Basic pass/fail heuristic: we expect BAF to block a substantial fraction of the flood.
  // Adjust threshold to taste.
  const blockedRatio = stats.blocked / Math.max(stats.total, 1);
  console.log('blocked ratio:', blockedRatio.toFixed(3));

  const threshold = Number(process.env.MSP_BLOCK_THRESHOLD || 0.5);
  if (blockedRatio >= threshold) {
    console.log(`[mempool] OK: blockedRatio ${blockedRatio.toFixed(3)} >= threshold ${threshold}`);
    process.exit(0);
  } else {
    console.warn(`[mempool] WARNING: blockedRatio ${blockedRatio.toFixed(3)} < threshold ${threshold}`);
    process.exit(2);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
