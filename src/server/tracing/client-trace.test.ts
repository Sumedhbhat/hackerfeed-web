import { installSentryTestClient } from "@hackerfeed/runtime/testing/sentry-test-client";
import {
	CLIENT_TRACE_HEADER,
	SERVER_TRACE_ID_HEADER,
} from "@hackerfeed/runtime/trace-headers";
import * as Sentry from "@sentry/core";
import { beforeAll, describe, expect, it } from "vitest";
import {
	linkClientTrace,
	parseClientTrace,
	withoutIncomingTrace,
	withServerTraceId,
} from "./client-trace";

const FORGED_TRACE_ID = "deadbeefdeadbeefdeadbeefdeadbeef";
const FORGED_SENTRY_TRACE = `${FORGED_TRACE_ID}-1234567890abcdef-1`;

beforeAll(() => {
	installSentryTestClient();
});

function serverTraceFor(request: Request) {
	return Sentry.continueTrace(
		{
			sentryTrace: request.headers.get("sentry-trace") ?? undefined,
			baggage: request.headers.get("baggage") ?? undefined,
		},
		() =>
			Sentry.startSpan({ name: "request" }, (span) => {
				linkClientTrace(request);
				return Sentry.spanToJSON(span);
			}),
	);
}

describe("client trace", () => {
	it("never lets a forged sentry-trace become the server trace", () => {
		const forged = new Request("https://hackerfeed.test/api/trpc", {
			headers: {
				"sentry-trace": FORGED_SENTRY_TRACE,
				baggage: "sentry-org_id=123,sentry-sampled=true",
				traceparent: `00-${FORGED_TRACE_ID}-1234567890abcdef-01`,
			},
		});

		expect(serverTraceFor(forged).trace_id).toBe(FORGED_TRACE_ID);

		const stripped = withoutIncomingTrace(forged);
		expect(stripped.headers.has("sentry-trace")).toBe(false);
		expect(stripped.headers.has("traceparent")).toBe(false);
		expect(serverTraceFor(stripped).trace_id).not.toBe(FORGED_TRACE_ID);
	});

	it("links the server trace to the browser trace the client claims", () => {
		const request = withoutIncomingTrace(
			new Request("https://hackerfeed.test/api/trpc", {
				headers: { [CLIENT_TRACE_HEADER]: FORGED_SENTRY_TRACE },
			}),
		);

		const span = serverTraceFor(request);

		expect(span.trace_id).not.toBe(FORGED_TRACE_ID);
		expect(span.attributes?.["client.trace_id"]).toBe(FORGED_TRACE_ID);
		expect(span.links).toEqual([
			expect.objectContaining({
				trace_id: FORGED_TRACE_ID,
				span_id: "1234567890abcdef",
			}),
		]);
	});

	it("ignores client trace values that are not trace headers", () => {
		expect(parseClientTrace(null)).toBeUndefined();
		expect(parseClientTrace("not-a-trace")).toBeUndefined();
		expect(parseClientTrace(`${FORGED_TRACE_ID}-123`)).toBeUndefined();
	});

	it("adds the server trace ID to responses that lack one", () => {
		const response = withServerTraceId(
			new Response("ok", { status: 201 }),
			FORGED_TRACE_ID,
		);

		expect(response.status).toBe(201);
		expect(response.headers.get(SERVER_TRACE_ID_HEADER)).toBe(FORGED_TRACE_ID);
	});
});
