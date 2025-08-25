import axios from 'axios';

// NOTA: Estos raw txs son placeholders y no reales; para una prueba real, usa un raw tx válido en tu red.
const RAW_LOW_GASPRICE = '0x02';

async function main() {
	const url = process.env.BAF_URL || 'http://localhost:3000';
	const raw = process.env.RAW_TX || RAW_LOW_GASPRICE;
	const payload = { jsonrpc: '2.0', method: 'eth_sendRawTransaction', params: [raw], id: 1 };
	const { data } = await axios.post(url, payload, { headers: { 'content-type': 'application/json' } });
	console.log(JSON.stringify(data, null, 2));
}

main().catch((e) => { console.error(e.message); process.exit(1); });