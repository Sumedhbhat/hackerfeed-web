import { generateKeyPair, SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { getBearerToken, verifyWorkosAccessToken } from "./workos-access-token";

function requestWithHeaders(headers: HeadersInit) {
	return new Request("https://example.com/api/trpc", { headers });
}

async function createToken({
	expirationTime = "1h",
	sub = "workos-user-1",
}: {
	expirationTime?: string;
	sub?: string;
} = {}) {
	const { privateKey, publicKey } = await generateKeyPair("RS256");
	const jwt = new SignJWT({})
		.setProtectedHeader({ alg: "RS256" })
		.setExpirationTime(expirationTime)
		.setIssuedAt();

	return {
		publicKey,
		token: sub
			? await jwt.setSubject(sub).sign(privateKey)
			: await jwt.sign(privateKey),
	};
}

describe("getBearerToken", () => {
	it("parses valid bearer tokens", () => {
		expect(
			getBearerToken(requestWithHeaders({ Authorization: "Bearer token-123" })),
		).toBe("token-123");
	});

	it("rejects missing auth headers", () => {
		expect(getBearerToken(requestWithHeaders({}))).toBeNull();
	});

	it("rejects empty bearer tokens", () => {
		expect(
			getBearerToken(requestWithHeaders({ Authorization: "Bearer" })),
		).toBeNull();
	});

	it("rejects malformed auth headers", () => {
		expect(
			getBearerToken(
				requestWithHeaders({ Authorization: "Bearer token-123 extra" }),
			),
		).toBeNull();
	});

	it("rejects non-bearer auth headers", () => {
		expect(
			getBearerToken(requestWithHeaders({ Authorization: "Basic token-123" })),
		).toBeNull();
	});
});

describe("verifyWorkosAccessToken", () => {
	it("verifies matching WorkOS JWTs and returns the subject as the user id", async () => {
		const { publicKey, token } = await createToken({ sub: "workos-user-123" });

		await expect(verifyWorkosAccessToken(token, publicKey)).resolves.toEqual({
			workosUserId: "workos-user-123",
		});
	});

	it("rejects tokens signed by another key", async () => {
		const { token } = await createToken();
		const { publicKey: otherKey } = await createToken();

		await expect(verifyWorkosAccessToken(token, otherKey)).resolves.toBeNull();
	});

	it("rejects expired tokens", async () => {
		const { publicKey, token } = await createToken({ expirationTime: "-1s" });

		await expect(verifyWorkosAccessToken(token, publicKey)).resolves.toBeNull();
	});

	it("rejects tokens without a subject", async () => {
		const { publicKey, token } = await createToken({ sub: "" });

		await expect(verifyWorkosAccessToken(token, publicKey)).resolves.toBeNull();
	});
});
