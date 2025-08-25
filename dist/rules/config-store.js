"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleConfigStore = void 0;
class RuleConfigStore {
    constructor(initial) {
        this.cfg = JSON.parse(JSON.stringify(initial));
    }
    get() {
        return this.cfg;
    }
    update(partial) {
        this.cfg = { ...this.cfg, ...partial, static: { ...this.cfg.static, ...(partial.static || {}) }, heuristics: { ...this.cfg.heuristics, ...(partial.heuristics || {}) }, reputation: { ...this.cfg.reputation, ...(partial.reputation || {}) } };
    }
    addBlockedAddress(addr) {
        const a = addr.toLowerCase();
        const cur = new Set(this.cfg.static.blockedAddresses || []);
        cur.add(a);
        this.cfg.static.blockedAddresses = Array.from(cur);
    }
    removeBlockedAddress(addr) {
        const a = addr.toLowerCase();
        this.cfg.static.blockedAddresses = (this.cfg.static.blockedAddresses || []).filter((x) => x !== a);
    }
    setAllowedMethods(methods) {
        this.cfg.static.allowedMethods = methods.map((m) => m.toLowerCase());
    }
    setBlockedMethods(methods) {
        this.cfg.static.blockedMethods = methods.map((m) => m.toLowerCase());
    }
}
exports.RuleConfigStore = RuleConfigStore;
//# sourceMappingURL=config-store.js.map