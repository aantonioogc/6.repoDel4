"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.metrics = void 0;
exports.createPrometheus = createPrometheus;
exports.getMetricsRegistry = getMetricsRegistry;
const prom_client_1 = __importStar(require("prom-client"));
let registry = null;
exports.metrics = {
    jsonRpcRequestsTotal: new prom_client_1.Counter({
        name: 'baf_jsonrpc_requests_total',
        help: 'Total JSON-RPC requests processed by the firewall',
        labelNames: ['method', 'decision', 'reason']
    }),
    jsonRpcForwardLatencyMs: new prom_client_1.Histogram({
        name: 'baf_jsonrpc_forward_latency_ms',
        help: 'Latency forwarding JSON-RPC to upstream in milliseconds',
        buckets: [5, 10, 20, 50, 100, 200, 500, 1000, 2000]
    }),
    jsonRpcBlockedTotal: new prom_client_1.Counter({
        name: 'baf_jsonrpc_blocked_total',
        help: 'Total JSON-RPC requests blocked',
        labelNames: ['method', 'reason']
    })
};
function createPrometheus() {
    if (registry)
        return; // singleton init
    registry = new prom_client_1.default.Registry();
    prom_client_1.default.collectDefaultMetrics({ register: registry, prefix: 'baf_' });
    registry.registerMetric(exports.metrics.jsonRpcRequestsTotal);
    registry.registerMetric(exports.metrics.jsonRpcForwardLatencyMs);
    registry.registerMetric(exports.metrics.jsonRpcBlockedTotal);
}
function getMetricsRegistry() {
    if (!registry) {
        createPrometheus();
    }
    return registry;
}
//# sourceMappingURL=prometheus.js.map