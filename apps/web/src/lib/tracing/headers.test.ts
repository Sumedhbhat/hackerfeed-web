import * as Sentry from "@sentry/core";
import { beforeAll, describe, expect, it } from "vitest";
import { installSentryTestClient } from "#/test/sentryTestClient";
import { CLIENT_TRACE_HEADER, getClientTraceHeaders } from "./headers";

beforeAll(() => {
	installSentryTestClient({ tracePropagationTargets: [] });
});

describe("getClientTraceHeaders", () => {
	it("sends the active browser span even though trace propagation is off", () => {
		Sentry.startSpan({ name: "click save" }, (span) => {
			const { trace_id, span_id } = Sentry.spanToJSON(span);

			expect(getClientTraceHeaders()).toEqual({
				[CLIENT_TRACE_HEADER]: `${trace_id}-${span_id}-1`,
			});
		});
	});
});
