import * as Sentry from "@sentry/core";
import { beforeAll, describe, expect, it } from "vitest";
import { CLIENT_TRACE_HEADER, getClientTraceHeaders } from "./headers";

class TestClient extends Sentry.Client<Sentry.ClientOptions> {
	constructor(options: Sentry.ClientOptions) {
		super(options);
	}
	eventFromException() {
		return Promise.resolve({});
	}
	eventFromMessage() {
		return Promise.resolve({});
	}
}

beforeAll(() => {
	const client = new TestClient({
		dsn: "https://public@o123.ingest.sentry.io/1",
		integrations: [],
		stackParser: () => [],
		tracesSampleRate: 1,
		tracePropagationTargets: [],
		transport: () => ({ send: async () => ({}), flush: async () => true }),
	});
	Sentry.setCurrentClient(client);
	client.init();
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
