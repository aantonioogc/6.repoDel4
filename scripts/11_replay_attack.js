// scripts/11_replay_attack.js
import { Wallet, providers } from 'ethers';

const PROVIDER_A = process.env.PROVIDER_A || 'http://localhost:9545'; // node A
const BAF_RPC = process.env.BAF_RPC || 'http://localhost:8545'; // B target (BAF->nodeB)
const providerA = new providers.JsonRpcProvider(PROVIDER_A);
const baf = new providers.JsonRpcProvider(BAF_RPC);

async function run() {
  // generate wallet and fund on A, sign tx with chainId provided by providerA
  const wallet = Wallet.createRandom().connect(providerA);
  // (Fund wallet on A needed)
  const tx = {
    to: wallet.address,
    value: 1n,
    gasLimit: 21000,
    chainId: await providerA.getNetwork().then(n=>n.chainId)
  };
  const signed = await wallet.signTransaction(tx);

  // Now send signed raw to BAF endpoint (node B has different chainId)
  try {
    const res = await baf.sendTransaction(signed);
    console.log('send result', res);
  } catch (err) {
    console.error('Expected rejection or error:', err);
  }
}

run();
