import axios from 'axios';

async function main() {
	const url = process.env.BAF_URL || 'http://localhost:3000';
	const adminToken = process.env.ADMIN_TOKEN || 'secret';
	await axios.post(url + '/admin/rules', { heuristics: { rateLimit: { windowSeconds: 2, perAddressTps: 3 } } }, { headers: { 'x-admin-token': adminToken } }).catch(() => {});

	const from = (process.env.FROM || '0x1111111111111111111111111111111111111111').toLowerCase();
	const n = Number(process.env.N || 20);
	const reqs = Array.from({ length: n }, (_, i) => ({ jsonrpc: '2.0', method: 'eth_sendTransaction', params: [{ from, to: '0x2222222222222222222222222222222222222222', value: '0x0' }], id: i + 1 }));
	const results = await Promise.all(reqs.map((p) => axios.post(url, p, { headers: { 'content-type': 'application/json' } }).then(r => r.data).catch(e => e.response?.data || { error: e.message })));
	const blocked = results.filter((r) => r?.error?.message?.includes('Blocked by BAF'));
	console.log(`sent=${n} blocked=${blocked.length}`);
	if (blocked.length > 0) console.log('example blocked:', JSON.stringify(blocked[0], null, 2));
}

main().catch((e) => { console.error(e.message); process.exit(1); });