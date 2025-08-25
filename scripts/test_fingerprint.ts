import axios from 'axios';

async function main() {
	const url = process.env.BAF_URL || 'http://localhost:3000';
	const adminToken = process.env.ADMIN_TOKEN || 'secret';
	await axios.post(url + '/admin/rules', { heuristics: { fingerprintWindowSeconds: 5, fingerprintMaxRepeats: 5 } }, { headers: { 'x-admin-token': adminToken } }).catch(() => {});

	const n = Number(process.env.N || 20);
	const payload = { jsonrpc: '2.0', method: 'eth_getBalance', params: ['0x0000000000000000000000000000000000000000', 'latest'], id: 1 };
	const results = await Promise.all(Array.from({ length: n }, () => axios.post(url, payload, { headers: { 'content-type': 'application/json' } }).then(r => r.data).catch(e => e.response?.data || { error: e.message })));
	const blocked = results.filter((r) => r?.error?.message?.includes('Blocked by BAF'));
	console.log(`sent=${n} blocked=${blocked.length}`);
	if (blocked.length > 0) console.log('example blocked:', JSON.stringify(blocked[0], null, 2));
}

main().catch((e) => { console.error(e.message); process.exit(1); });