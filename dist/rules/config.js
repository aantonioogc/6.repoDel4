"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadRuleConfig = loadRuleConfig;
function parseCsvEnv(name, defaultValue = []) {
    const raw = process.env[name];
    if (!raw)
        return defaultValue;
    return raw
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v.length > 0)
        .map((v) => v.toLowerCase());
}
function parseNumberEnv(name, defaultValue) {
    const raw = process.env[name];
    if (!raw)
        return defaultValue;
    const n = Number(raw);
    return Number.isFinite(n) ? n : defaultValue;
}
function loadRuleConfig() {
    const allowedMethods = parseCsvEnv('BAF_ALLOWED_METHODS', []);
    let blockedMethods = parseCsvEnv('BAF_BLOCKED_METHODS', []);
    if (blockedMethods.length === 0) {
        blockedMethods = [
            'debug_traceTransaction',
            'debug_traceCall',
            'trace_call',
            'trace_get',
            'trace_block',
            'trace_replayBlockTransactions',
            'hardhat_setBalance',
            'hardhat_setCode',
            'anvil_setBalance',
            'anvil_setCode'
        ];
    }
    const blockedAddresses = parseCsvEnv('BAF_BLOCKED_ADDRESSES', []);
    const windowSeconds = parseNumberEnv('BAF_WINDOW_SECONDS', 10);
    const perIpTps = parseNumberEnv('BAF_RATE_LIMIT_IP_TPS', 50);
    const perAddressTps = parseNumberEnv('BAF_RATE_LIMIT_ADDRESS_TPS', 20);
    const perMethodPerIpTps = parseNumberEnv('BAF_RATE_LIMIT_METHOD_IP_TPS', 0);
    const fingerprintWindowSeconds = parseNumberEnv('BAF_FINGERPRINT_WINDOW_SECONDS', 0);
    const fingerprintMaxRepeats = parseNumberEnv('BAF_FINGERPRINT_MAX_REPEATS', 0);
    const nonceAnomalyWindowSeconds = parseNumberEnv('BAF_NONCE_WINDOW_SECONDS', 0);
    const maxDuplicateNoncesPerWindow = parseNumberEnv('BAF_NONCE_MAX_DUPLICATES', 0);
    const sybilUniqueAddressesWindowSeconds = parseNumberEnv('BAF_SYBIL_ADDRS_WINDOW_SECONDS', 0);
    const sybilMaxUniqueAddressesPerWindow = parseNumberEnv('BAF_SYBIL_MAX_UNIQUE_ADDRS', 0);
    const maxGasPriceWei = process.env.BAF_MAX_GAS_PRICE_WEI;
    const minGasPriceWei = process.env.BAF_MIN_GAS_PRICE_WEI;
    const maxGasLimit = process.env.BAF_MAX_GAS_LIMIT ? Number(process.env.BAF_MAX_GAS_LIMIT) : undefined;
    return {
        static: {
            allowedMethods: allowedMethods.length ? allowedMethods : undefined,
            blockedMethods: blockedMethods.length ? blockedMethods : undefined,
            blockedAddresses: blockedAddresses.length ? blockedAddresses : undefined,
            maxGasPriceWei: maxGasPriceWei || undefined,
            minGasPriceWei: minGasPriceWei || undefined,
            maxGasLimit: typeof maxGasLimit === 'number' && Number.isFinite(maxGasLimit) ? maxGasLimit : undefined
        },
        heuristics: {
            rateLimit: {
                windowSeconds,
                perIpTps,
                perAddressTps,
                perMethodPerIpTps
            },
            fingerprintWindowSeconds: fingerprintWindowSeconds || undefined,
            fingerprintMaxRepeats: fingerprintMaxRepeats || undefined,
            nonceAnomalyWindowSeconds: nonceAnomalyWindowSeconds || undefined,
            maxDuplicateNoncesPerWindow: maxDuplicateNoncesPerWindow || undefined,
            sybilUniqueAddressesWindowSeconds: sybilUniqueAddressesWindowSeconds || undefined,
            sybilMaxUniqueAddressesPerWindow: sybilMaxUniqueAddressesPerWindow || undefined
        }
    };
}
//# sourceMappingURL=config.js.map