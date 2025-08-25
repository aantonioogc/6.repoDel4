"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReputationService = void 0;
class ReputationService {
    constructor(store, cfg) {
        this.store = store;
        this.cfg = cfg || { initialScore: 100, minScoreToAllow: 0, penaltyBlocked: 5, rewardAllowed: 1 };
    }
    key(type, id) {
        return `rep:${type}:${id}`;
    }
    async getScore(type, id) {
        const v = await this.store.get(this.key(type, id));
        if (typeof v === 'number')
            return v;
        return this.cfg.initialScore ?? 100;
    }
    async adjustScore(type, id, delta) {
        const cur = await this.getScore(type, id);
        const next = cur + delta;
        await this.store.set(this.key(type, id), next);
        return next;
    }
    async shouldAllow(type, id) {
        const score = await this.getScore(type, id);
        const min = this.cfg.minScoreToAllow ?? 0;
        return score >= min;
    }
    getConfig() { return this.cfg; }
}
exports.ReputationService = ReputationService;
//# sourceMappingURL=reputation-service.js.map