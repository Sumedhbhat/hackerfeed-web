/**
 * The one logger for HackerFeed, on the server (Worker) and in the browser.
 *
 * Every call goes to two places:
 *  - Sentry Logs, as structured attributes linked to the active trace.
 *  - The console, so `wrangler tail`, Workers Logs and devtools still show it.
 *
 * Pass the caught value as `error` and `logger.error` also records a Sentry
 * issue with its stack trace. Every error returns the trace ID; show it to the
 * user (see `FatalErrorView`) and search `trace:<id>` in Sentry to find the
 * issue, its logs, and its spans. Browser and Worker traces are separate and
 * linked; see README > Observability.
 *
 * Usage:
 *   import { logger } from "#/lib/logger";
 *   logger.info("feed loaded", { feed: "top", count: 30 });
 *   const traceId = logger.error("favorites load failed", { error, storyId });
 */
import * as Sentry from "@sentry/core";

type LogLevel = "debug" | "info" | "warn" | "error";

/** Extra fields for a log line; `error` is the caught value, if any. */
export type LogContext = { error?: unknown; [key: string]: unknown };

const TRACE_ID_PATTERN = /^[a-f0-9]{32}$/;

/** Trace ID of the current request or page, when Sentry is running. */
export function getTraceId(): string | undefined {
	if (!Sentry.getClient()) return undefined;

	const span = Sentry.getActiveSpan();
	const traceId = span
		? Sentry.spanToJSON(span).trace_id
		: Sentry.getCurrentScope().getPropagationContext().traceId;

	return TRACE_ID_PATTERN.test(traceId) ? traceId : undefined;
}

/** Tags later logs, issues and traces with the WorkOS user (no PII). */
export function setLogUser(workosUserId: string | null) {
	Sentry.setUser(workosUserId ? { id: workosUserId } : null);
}

function toAttributes({ error, ...context }: LogContext = {}) {
	const attributes: Record<string, string | number | boolean> = {};

	for (const [key, value] of Object.entries(context)) {
		if (value === undefined || value === null) continue;
		attributes[key] =
			typeof value === "string" ||
			typeof value === "number" ||
			typeof value === "boolean"
				? value
				: JSON.stringify(value);
	}
	if (error !== undefined) {
		attributes.err = error instanceof Error ? error.message : String(error);
	}

	return attributes;
}

function emit(level: LogLevel, message: string, context?: LogContext) {
	const attributes = toAttributes(context);
	const traceId = getTraceId();

	Sentry.logger[level](message, attributes);

	if (level === "error" && context?.error !== undefined) {
		Sentry.captureException(context.error, {
			extra: attributes,
			tags: { log_message: message },
		});
	}

	const entry = { level, message, traceId, ...attributes };
	const write = level === "debug" ? console.debug : console[level];

	if (typeof window === "undefined") {
		// One JSON object per line, so Workers Logs indexes each field.
		write(JSON.stringify({ ts: new Date().toISOString(), ...entry }));
	} else {
		write(`[${level}] ${message}`, entry);
	}

	return traceId;
}

export const logger = {
	debug: (message: string, context?: LogContext) => {
		emit("debug", message, context);
	},
	info: (message: string, context?: LogContext) => {
		emit("info", message, context);
	},
	warn: (message: string, context?: LogContext) => {
		emit("warn", message, context);
	},
	/** Logs and, when `context.error` is set, records a Sentry issue. Returns the trace ID. */
	error: (message: string, context?: LogContext): string | undefined =>
		emit("error", message, context),
};
