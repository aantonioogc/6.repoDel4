"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryRateLimiterStore = exports.InMemoryKeyValueStore = void 0;
class InMemoryKeyValueStore {
    constructor() {
        this.store = new Map();
    }
    async get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return undefined;
        if (entry.expiresAt && entry.expiresAt < Date.now()) {
            this.store.delete(key);
            return undefined;
        }
        return entry.value;
    }
    async set(key, value, ttlMs) {
        const expiresAt = ttlMs ? Date.now() + ttlMs : undefined;
        this.store.set(key, { value, expiresAt });
    }
    async delete(key) {
        this.store.delete(key);
    }
}
exports.InMemoryKeyValueStore = InMemoryKeyValueStore;
class InMemoryRateLimiterStore {
    constructor() {
        this.counters = new Map();
        this.sets = new Map();
    }
    async incrementAndGetCount(key, windowMs) {
        const now = Date.now();
        const cur = this.counters.get(key);
        if (!cur || cur.windowEndsAt <= now) {
            const next = { count: 1, windowEndsAt: now + windowMs };
            this.counters.set(key, next);
            return next.count;
        }
        cur.count += 1;
        return cur.count;
    }
    async addToSetAndGetSize(key, member, ttlMs) {
        const now = Date.now();
        let entry = this.sets.get(key);
        if (!entry || entry.expiresAt <= now) {
            entry = { members: new Set(), expiresAt: now + ttlMs };
            this.sets.set(key, entry);
        }
        entry.members.add(member);
        return entry.members.size;
    }
}
exports.InMemoryRateLimiterStore = InMemoryRateLimiterStore;
//# sourceMappingURL=in-memory-store.js.map