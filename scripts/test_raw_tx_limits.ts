import axios from 'axios';
import { Wallet, parseEther } from 'ethers';

async function main() {
	const url = process.env.BAF_URL || 'http://localhost:3000';
	const rpc = process.env.RPC_URL || 'http://127.0.0.1:8545';
	const pk = process.env.PK || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Ganache acc 0
	const wallet = new Wallet(pk);

	// Configurar reglas: límites de gas
	const adminToken = process.env.ADMIN_TOKEN || 'secret';
	await axios.post(url + '/admin/rules', { static: { maxGasPriceWei: '3000000000', minGasPriceWei: '1000', maxGasLimit: 30000000 } }, { headers: { 'x-admin-token': adminToken } }).catch(() => {});

	// Nonce y chainId
	const { data: blockNum } = await axios.post(rpc, { jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 });
	if (!blockNum?.result) throw new Error('RPC not reachable');
	const { data: nonceRes } = await axios.post(rpc, { jsonrpc: '2.0', method: 'eth_getTransactionCount', params: [wallet.address, 'latest'], id: 2 });
	const nonce = Number(nonceRes.result);
	const tx = {
		chainId: 1337,
		nonce,
		to: '0x0000000000000000000000000000000000000000',
		value: parseEther('0'),
		gasPrice: 4_000_000_000n, // 4 gwei > maxGasPriceWei -> debe bloquear
		gasLimit: 21000
	};
	const raw = await wallet.signTransaction(tx);
	const { data } = await axios.post(url, { jsonrpc: '2.0', method: 'eth_sendRawTransaction', params: [raw], id: 3 }, { headers: { 'content-type': 'application/json' } });
	console.log(JSON.stringify(data, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });