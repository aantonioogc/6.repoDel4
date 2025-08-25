import axios from 'axios';

async function main() {
	const url = process.env.BAF_URL || 'http://localhost:3000';
	const adminToken = process.env.ADMIN_TOKEN || 'secret';
	// Asegura límites agresivos vía Admin API
	await axios.post(url + '/admin/rules', { heuristics: { rateLimit: { windowSeconds: 2, perIpTps: 5 } } }, { headers: { 'x-admin-token': adminToken } }).catch(() => {});

	const method = process.env.METHOD || 'web3_clientVersion';
	const n = Number(process.env.N || 50);
	const reqs = Array.from({ length: n }, (_, i) => ({ jsonrpc: '2.0', method, params: [], id: i + 1 }));
	const promises = reqs.map((p) => axios.post(url, p, { headers: { 'content-type': 'application/json' } }).then(r => r.data).catch(e => e.response?.data || { error: e.message }));
	const results = await Promise.all(promises);
	const blocked = results.filter((r) => r?.error?.message?.includes('Blocked by BAF'));
	console.log(`sent=${n} blocked=${blocked.length}`);
	if (blocked.length > 0) {
		console.log('example blocked:', JSON.stringify(blocked[0], null, 2));
	}
}

main().catch((e) => { console.error(e.message); process.exit(1); });