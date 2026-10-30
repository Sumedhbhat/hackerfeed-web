import {
	CLIENT_TRACE_HEADER,
	SERVER_TRACE_ID_HEADER,
} from "@hackerfeed/runtime/trace-headers";
import * as Sentry from "@sentry/core";

const INCOMING_TRACE_HEADERS = [
	"sentry-trace",
	"baggage",
	"traceparent",
	"tracestate",
];

const SENTRY_TRACE_PATTERN = /^([0-9a-f]{32})-([0-9a-f]{16})(?:-[01])?$/;

export function parseClientTrace(
	value: string | null,
): { traceId: string; spanId: string } | undefined {
	const match = value?.trim().match(SENTRY_TRACE_PATTERN);
	return match ? { traceId: match[1], spanId: match[2] } : undefined;
}

/**
 * Removes trace headers so Sentry starts a fresh server trace instead of
 * continuing one the client chose.
 */
export function withoutIncomingTrace<R extends Request>(request: R): R {
	if (!INCOMING_TRACE_HEADERS.some((name) => request.headers.has(name))) {
		return request;
	}
	const headers = new Headers(request.headers);
	for (const name of INCOMING_TRACE_HEADERS) headers.delete(name);
	return new Request(request, { headers }) as R;
}

/** Links the request's root span to the browser trace the client claims. */
export function linkClientTrace(request: Request) {
	const clientTrace = parseClientTrace(
		request.headers.get(CLIENT_TRACE_HEADER),
	);
	const activeSpan = Sentry.getActiveSpan();
	if (!clientTrace || !activeSpan) return;

	const rootSpan = Sentry.getRootSpan(activeSpan);
	rootSpan.addLink({
		context: { ...clientTrace, traceFlags: 0 },
		attributes: { "sentry.link.type": "client_request" },
	});
	rootSpan.setAttribute("client.trace_id", clientTrace.traceId);
}

export function withServerTraceId(
	response: Response,
	traceId: string | undefined,
): Response {
	if (!traceId || response.headers.has(SERVER_TRACE_ID_HEADER)) {
		return response;
	}
	const traced = new Response(response.body, response);
	traced.headers.set(SERVER_TRACE_ID_HEADER, traceId);
	return traced;
}
