"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = void 0;
class EventBus {
    constructor() {
        this.subscribers = new Set();
    }
    subscribe(res) {
        this.subscribers.add(res);
        res.on('close', () => this.subscribers.delete(res));
    }
    emit(event) {
        const line = `data: ${JSON.stringify(event)}\n\n`;
        for (const s of this.subscribers) {
            try {
                s.write(line);
            }
            catch { /* ignore */ }
        }
    }
}
exports.EventBus = EventBus;
//# sourceMappingURL=event-bus.js.map