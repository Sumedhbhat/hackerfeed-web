import * as Sentry from "@sentry/core";

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

/** Installs a Sentry client that records every span and sends nothing. */
export function installSentryTestClient(
	options: Partial<Sentry.ClientOptions> = {},
) {
	const client = new TestClient({
		dsn: "https://public@o123.ingest.sentry.io/1",
		integrations: [],
		stackParser: () => [],
		tracesSampleRate: 1,
		transport: () => ({ send: async () => ({}), flush: async () => true }),
		...options,
	});
	Sentry.setCurrentClient(client);
	client.init();

	const ended: Sentry.Span[] = [];
	client.on("spanEnd", (span) => {
		ended.push(span);
	});
	return {
		/** Spans that have ended, as Sentry would send them. */
		endedSpans: () => ended.map((span) => Sentry.spanToJSON(span)),
	};
}
