import { createLogger, format, transports, Logger } from 'winston';

export function buildLogger(): Logger {
	const logLevel = process.env.LOG_LEVEL || 'info';
	return createLogger({
		level: logLevel,
		format: format.combine(
			format.timestamp(),
			format.errors({ stack: true }),
			format.splat(),
			format.json()
		),
		transports: [
			new transports.Console({})
		]
	});
}