"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildLogger = buildLogger;
const winston_1 = require("winston");
function buildLogger() {
    const logLevel = process.env.LOG_LEVEL || 'info';
    return (0, winston_1.createLogger)({
        level: logLevel,
        format: winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.errors({ stack: true }), winston_1.format.splat(), winston_1.format.json()),
        transports: [
            new winston_1.transports.Console({})
        ]
    });
}
//# sourceMappingURL=logger.js.map