"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateStaticRules = evaluateStaticRules;
function evaluateStaticRules(cfg, ctx) {
    const method = ctx.method.toLowerCase();
    if (cfg.static.blockedMethods && cfg.static.blockedMethods.includes(method)) {
        return { decision: 'block', reason: 'blocked_method', rule: 'static.blockedMethods', tags: ['static'] };
    }
    if (cfg.static.allowedMethods && !cfg.static.allowedMethods.includes(method)) {
        return { decision: 'block', reason: 'method_not_allowed', rule: 'static.allowedMethods', tags: ['static'] };
    }
    const addresses = [ctx.from?.toLowerCase(), ctx.to?.toLowerCase()].filter(Boolean);
    if (cfg.static.blockedAddresses && addresses.some((a) => cfg.static.blockedAddresses.includes(a))) {
        return { decision: 'block', reason: 'blocked_address', rule: 'static.blockedAddresses', tags: ['static'] };
    }
    if (ctx.gasPriceWei !== undefined) {
        if (cfg.static.maxGasPriceWei && BigInt(cfg.static.maxGasPriceWei) && ctx.gasPriceWei > BigInt(cfg.static.maxGasPriceWei)) {
            return { decision: 'block', reason: 'gas_price_too_high', rule: 'static.maxGasPriceWei', tags: ['static', 'gas'] };
        }
        if (cfg.static.minGasPriceWei && BigInt(cfg.static.minGasPriceWei) && ctx.gasPriceWei < BigInt(cfg.static.minGasPriceWei)) {
            return { decision: 'block', reason: 'gas_price_too_low', rule: 'static.minGasPriceWei', tags: ['static', 'gas'] };
        }
    }
    if (ctx.gasLimit !== undefined && cfg.static.maxGasLimit && ctx.gasLimit > BigInt(cfg.static.maxGasLimit)) {
        return { decision: 'block', reason: 'gas_limit_too_high', rule: 'static.maxGasLimit', tags: ['static', 'gas'] };
    }
    return null;
}
//# sourceMappingURL=static-rules.js.map