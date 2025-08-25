import axios from 'axios';

async function main() {
	const url = process.env.BAF_URL || 'http://localhost:3000';
	const batch = [
		{ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 },
		{ jsonrpc: '2.0', method: 'web3_clientVersion', params: [], id: 2 },
		{ jsonrpc: '2.0', method: 'eth_getBalance', params: ['0x0000000000000000000000000000000000000000', 'latest'], id: 3 }
	];
	const { data } = await axios.post(url, batch, { headers: { 'content-type': 'application/json' } });
	console.log(JSON.stringify(data, null, 2));
}

main().catch((e) => { console.error(e.message); process.exit(1); });