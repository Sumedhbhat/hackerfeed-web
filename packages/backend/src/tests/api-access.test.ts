import { describe, expect } from "vitest";
import { getBearerToken } from "../auth/workos-access-token";
import { createSigningKey } from "./support/external-services";
import { INTEGRATION, test } from "./support/test";

const PATHS = ["/api/trpc/account.me", "/api/feature-flags", "/x"];

function requestWithHeaders(headers: HeadersInit) {
	return new Request("https://example.com/api/trpc", { headers });
}

describe("bearer token parsing", () => {
	test("reads a valid bearer token", () => {
		expect(
			getBearerToken(requestWithHeaders({ Authorization: "Bearer token-123" })),
		).toBe("token-123");
	});

	test.each([
		["no header", {}],
		["an empty token", { Authorization: "Bearer" }],
		["extra parts", { Authorization: "Bearer token-123 extra" }],
		["another scheme", { Authorization: "Basic token-123" }],
	])("finds no token with %s", (_, headers) => {
		expect(getBearerToken(requestWithHeaders(headers))).toBeNull();
	});
});

describe("signed-out requests", () => {
	test(
		"with no token or a malformed header get 401 before routing",
		INTEGRATION,
		async ({ api }) => {
			for (const headers of [
				{},
				{ Authorization: "Basic abc" },
			] as HeadersInit[])
				for (const path of PATHS) {
					const response = await api.request(path, { headers });
					expect(response.status).toBe(401);
					expect(response.headers.get("WWW-Authenticate")).toBe(
						'Bearer realm="HackerFeed"',
					);
				}
		},
	);

	test(
		"with an expired token get 401",
		INTEGRATION,
		async ({ api, workos }) => {
			const token = await workos.accessToken("user_reader", {
				expiresAt: "-1s",
			});

			for (const path of PATHS)
				expect((await api.request(path, { token })).status).toBe(401);
		},
	);

	test(
		"with a token WorkOS didn't sign get 401",
		INTEGRATION,
		async ({ api, workos }) => {
			const token = await workos.accessToken("user_reader", {
				signedWith: await createSigningKey(),
			});

			for (const path of PATHS)
				expect((await api.request(path, { token })).status).toBe(401);
		},
	);

	test(
		"with a token that names no user get 401",
		INTEGRATION,
		async ({ api, workos }) => {
			const token = await workos.accessToken("");

			for (const path of PATHS)
				expect((await api.request(path, { token })).status).toBe(401);
		},
	);
});

describe("signed-in requests", () => {
	test(
		"with a valid WorkOS token are routed",
		INTEGRATION,
		async ({ api, workos }) => {
			const token = await workos.accessToken("user_reader");

			expect((await api.request("/api/feature-flags", { token })).status).toBe(
				200,
			);
			expect(await api.as("user_reader").account.me.query()).toMatchObject({
				preferences: { saved: false },
			});
		},
	);

	test("to an unknown path get 404", INTEGRATION, async ({ api, workos }) => {
		const response = await api.request("/x", {
			token: await workos.accessToken("user_reader"),
		});

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Not Found" });
	});
});
