import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "./content-security-policy";

describe("buildContentSecurityPolicy", () => {
	it("lets the browser connect only to the app, its API and the services it calls", () => {
		expect(
			buildContentSecurityPolicy({
				apiUrl: "https://hackerfeed-api.example.workers.dev/",
				workosApiHostname: "auth.example.com",
				sentryDsn: "https://key@o1.ingest.us.sentry.io/42",
			}),
		).toBe(
			"connect-src 'self' https://hackerfeed-api.example.workers.dev https://auth.example.com https://hacker-news.firebaseio.com https://o1.ingest.us.sentry.io",
		);
	});

	it("defaults to WorkOS's own API and leaves Sentry out without a DSN", () => {
		expect(
			buildContentSecurityPolicy({ apiUrl: "http://localhost:8787" }),
		).toBe(
			"connect-src 'self' http://localhost:8787 https://api.workos.com https://hacker-news.firebaseio.com",
		);
	});
});
