import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBackend } from "./index";

const handle = createBackend({ workos: { clientId: "client_test" } });

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("createBackend", () => {
	it.each([
		["no token", {}],
		["a malformed header", { Authorization: "Basic abc" }],
	])("rejects a request with %s before routing", async (_, headers) => {
		for (const path of ["/api/trpc/account.me", "/api/feature-flags", "/x"]) {
			const response = await handle(
				new Request(`https://api.example${path}`, { headers }),
			);
			expect(response.status).toBe(401);
			expect(response.headers.get("WWW-Authenticate")).toBe(
				'Bearer realm="HackerFeed"',
			);
		}
	});

	it("routes a request with a valid WorkOS token", async () => {
		const { privateKey, publicKey } = await generateKeyPair("RS256");
		const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256" };
		const fetchJwks = vi.fn(async () => Response.json({ keys: [jwk] }));
		vi.stubGlobal("fetch", fetchJwks);
		const token = await new SignJWT({})
			.setProtectedHeader({ alg: "RS256", kid: "k1" })
			.setSubject("workos-user-1")
			.setExpirationTime("1h")
			.sign(privateKey);

		const response = await createBackend({
			workos: { clientId: "client_valid" },
		})(
			new Request("https://api.example/api/feature-flags", {
				headers: { Authorization: `Bearer ${token}` },
			}),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ flags: {} });
		expect(String(fetchJwks.mock.calls[0]?.[0])).toContain(
			"/sso/jwks/client_valid",
		);
	});
});
