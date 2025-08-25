// scripts/02_eip1559_parse_and_validate.js
// Requisitos: npm i ethers axios
// Uso:
//   BAF_RPC=http://localhost:8546 node scripts/02_eip1559_parse_and_validate.js
//   (o sin BAF: BAF_RPC=http://localhost:8545 ...)

const { Wallet, utils, providers } = require('ethers');
const axios = require('axios');

// Config
const BAF_RPC = process.env.BAF_RPC || 'http://localhost:8545'; // endpoint del BAF (o del nodo si no usas BAF)
const http = axios.create({ baseURL: BAF_RPC, timeout: 15000 });
const provider = new providers.JsonRpcProvider(BAF_RPC);


// --- helpers RPC ---
async function rpc(method, params = []) {
  const { data } = await http.post('', {
    jsonrpc: '2.0',
    id: Math.floor(Math.random() * 1e6),
    method,
    params,
  });
  if (data.error) throw new Error(`${method} -> ${JSON.stringify(data.error)}`);
  return data.result;
}

async function chainIdHex() {
  const res = await rpc('eth_chainId');
  return res; // hex string
}

async function sendRaw(raw, label) {
  try {
    const res = await http.post('', {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_sendRawTransaction',
      params: [raw],
    });
    console.log(`\n[${label}] eth_sendRawTransaction ->`, res.data);
  } catch (e) {
    console.log(`\n[${label}] eth_sendRawTransaction ERROR ->`, e.response?.data || e.message);
  }
}

function hexToInt(hex) {
  if (hex.startsWith('0x')) return parseInt(hex, 16);
  return parseInt(hex, 10);
}

// --- main ---
async function run() {
  console.log('Target RPC:', BAF_RPC);

  // 0) Obtener chainId real del backend (a través del BAF)
  const chainId_hex = await chainIdHex();
  const chainId = hexToInt(chainId_hex);
  console.log('Backend chainId =', chainId, `(${chainId_hex})`);

  // 1) Preparar wallets y direcciones dummy (no necesitan fondos para firmar)
  const fundedPrivateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Hardhat default
  const sender = new Wallet(fundedPrivateKey, provider); 
  const receiver = Wallet.createRandom();   // receptor ficticio

  console.log('Test sender:', sender.address);
  console.log('Test receiver:', receiver.address);

  // --- Caso A: LEGACY SIN EIP-155 (sin chainId) ---
  // Nota: firmar una tx legacy sin "chainId" produce firma no protegida (v = 27/28).
  const legacyNoChainTx = {
    to: receiver.address,
    value: 0,
    gasLimit: 21000,
    gasPrice: utils.parseUnits('1', 'gwei'),
    nonce: 0,           // como el emisor no tiene fondos, el nodo rechazará por fondos; está bien para validar el BAF
    type: 0,            // Legacy
    // IMPORTANTE: no incluir chainId aquí
  };
  const legacyRaw = await sender.signTransaction(legacyNoChainTx);
  await sendRaw(legacyRaw, 'A) Legacy sin EIP-155 (sin chainId) -> ESPERADO: RECHAZO por replay_protection');

  // --- Caso B: EIP-1559 con chainId INCORRECTO ---
  // Firmamos una tx type 2 con chainId = backendChainId + 1
  const wrongChainId = chainId + 1; // otro chainId (simula replay/cadena equivocada)
  const eip1559WrongChainTx = {
    chainId: wrongChainId,
    type: 2,
    to: receiver.address,
    value: 0,
    nonce: 0,
    gasLimit: 21000,
    maxFeePerGas: utils.parseUnits('50', 'gwei'),
    maxPriorityFeePerGas: utils.parseUnits('2', 'gwei'),
    // accessList: [] // opcional
  };
  const rawWrongChain = await sender.signTransaction(eip1559WrongChainTx);
  await sendRaw(rawWrongChain, 'B) EIP-1559 con chainId incorrecto -> ESPERADO: RECHAZO por chainId mismatch');

  // --- Caso C: EIP-1559 con chainId CORRECTO ---
  // Debería pasar validaciones del BAF (no replay), aunque el nodo probablemente responda "insufficient funds"
  const eip1559GoodTx = {
    chainId,
    type: 2,
    to: receiver.address,
    value: 0,
    nonce: 1,
    gasLimit: 21000,
    maxFeePerGas: utils.parseUnits('50', 'gwei'),
    maxPriorityFeePerGas: utils.parseUnits('2', 'gwei'),
  };
  const rawGood = await sender.signTransaction(eip1559GoodTx);
  await sendRaw(rawGood, 'C) EIP-1559 con chainId correcto -> ESPERADO: ACEPTADO POR BAF (el nodo puede decir insufficient funds)');

  console.log('\n=== Test 2 finalizado ===');
  console.log('Interpretación:');
  console.log('- A) y B) deben ser BLOQUEADAS por el BAF (razones: replay_protection / chainId_mismatch).');
  console.log('- C) no debe ser bloqueada por el BAF (si falla será por fondos insuficientes en el nodo, lo cual es OK).');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
