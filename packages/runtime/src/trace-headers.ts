import * as Sentry from "@sentry/core";

/** Browser trace context, sent as a claim the server links to, never continues. */
export const CLIENT_TRACE_HEADER = "x-client-trace";

/** The Worker's own trace ID, on every response. */
export const SERVER_TRACE_ID_HEADER = "x-sentry-trace-id";

export function getClientTraceHeaders(): Record<string, string> {
	const sentryTrace = Sentry.getTraceData()["sentry-trace"];
	return sentryTrace ? { [CLIENT_TRACE_HEADER]: sentryTrace } : {};
}

export function readServerTraceId(response: Response): string | undefined {
	return response.headers.get(SERVER_TRACE_ID_HEADER) ?? undefined;
}
