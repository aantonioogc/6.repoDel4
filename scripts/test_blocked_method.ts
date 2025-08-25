import axios from 'axios';

async function main() {
	const url = process.env.BAF_URL || 'http://localhost:3000';
	const payload = { jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 };
	const { data } = await axios.post(url, payload, { headers: { 'content-type': 'application/json' } });
	console.log(JSON.stringify(data, null, 2));
}

main().catch((e) => { console.error(e.message); process.exit(1); });