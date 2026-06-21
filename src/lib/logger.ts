/**
 * Minimal structured logger for Cloudflare Workers.
 *
 * All console.* output is captured as structured events in the Workers
 * Logs dashboard. Each call emits a single-line JSON object so log
 * aggregators can parse individual fields (level, message, ts, …).
 *
 * Usage:
 *   import { logger } from "#/lib/logger";
 *   logger.info("feed loaded", { feed: "top", count: 30 });
 *   logger.error("fetch failed", { url, status: 503, err: e.message });
 */

type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

function emit(level: LogLevel, message: string, ctx?: LogContext): void {
	const entry = {
		level,
		message,
		ts: new Date().toISOString(),
		...ctx,
	};

	const line = JSON.stringify(entry);

	if (level === "error") {
		console.error(line);
	} else if (level === "warn") {
		console.warn(line);
	} else if (level === "debug") {
		console.debug(line);
	} else {
		console.log(line);
	}
}

export const logger = {
	debug: (message: string, ctx?: LogContext) => emit("debug", message, ctx),
	info: (message: string, ctx?: LogContext) => emit("info", message, ctx),
	warn: (message: string, ctx?: LogContext) => emit("warn", message, ctx),
	error: (message: string, ctx?: LogContext) => emit("error", message, ctx),
};
