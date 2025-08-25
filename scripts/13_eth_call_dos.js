// scripts/13_eth_call_dos.js
import axios from 'axios';
const BAF_RPC = process.env.BAF_RPC || 'http://localhost:8545';
const client = axios.create({ baseURL: BAF_RPC });

async function heavyCall() {
  // Example of a heavy eth_call (simulate contract exec with big loop)
  const payload = {
    jsonrpc: '2.0',
    id: 1,
    method: 'debug_traceTransaction', // or 'trace_call'
    params: ['0x...sampleTxHash...', {}]
  };
  return client.post('', payload);
}

(async ()=>{
  for (let i=0;i<500;i++){
    heavyCall().catch(e=>console.error('err', e.response?.data || e.message));
  }
})();
