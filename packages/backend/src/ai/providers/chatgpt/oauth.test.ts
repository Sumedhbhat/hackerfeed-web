import { generateKeyPair, type JWTPayload, SignJWT } from "jose";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { AiProviderError } from "../../errors";
import { createCodeChallenge } from "../../pkce";
import {
	CHATGPT_AUTHORIZE_URL,
	CHATGPT_ISSUER,
	CHATGPT_RESOURCE,
	CHATGPT_SCOPES,
	CHATGPT_TOKEN_URL,
	createAuthorizationRequest,
	DYNAMIC_CLIENT_ID,
	exchangeAuthorizationCode,
	isLoopbackRedirect,
	isValidIssuedClientId,
	refreshAccessToken,
	revokeRefreshToken,
	verifyIdToken,
} from "./oauth";

const CLIENT_ID = "oaiapp_test123";
let keys: Awaited<ReturnType<typeof generateKeyPair>>;

beforeAll(async () => {
	keys = await generateKeyPair("RS256");
});

async function signIdToken(
	claims: JWTPayload = {},
	{
		audience = CLIENT_ID,
		issuer = CHATGPT_ISSUER,
		expiresIn = "1h",
		subject = "user-sub-1",
	}: {
		audience?: string;
		issuer?: string;
		expiresIn?: string;
		subject?: string;
	} = {},
) {
	return new SignJWT({ email: "reader@example.com", name: "Reader", ...claims })
		.setProtectedHeader({ alg: "RS256" })
		.setIssuer(issuer)
		.setAudience(audience)
		.setSubject(subject)
		.setIssuedAt()
		.setExpirationTime(expiresIn)
		.sign(keys.privateKey);
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

function tokenBody(overrides: Record<string, unknown> = {}) {
	return {
		access_token: "access-1",
		refresh_token: "refresh-1",
		token_type: "Bearer",
		expires_in: 3600,
		scope: CHATGPT_SCOPES,
		id_token: "id-token-1",
		...overrides,
	};
}

describe("redirect availability", () => {
	it.each([
		["http://127.0.0.1:3000/ai/chatgpt/callback", true],
		["http://localhost:3000/ai/chatgpt/callback", false],
		["https://127.0.0.1/ai/chatgpt/callback", false],
		["https://hackerfeed.example.com/ai/chatgpt/callback", false],
	])("isLoopbackRedirect(%s) = %s", (uri, expected) => {
		expect(isLoopbackRedirect(uri)).toBe(expected);
	});
});

describe("isValidIssuedClientId", () => {
	it.each([
		[CLIENT_ID, true],
		[DYNAMIC_CLIENT_ID, false],
		[null, false],
		["", false],
		["bad id!", false],
		["x".repeat(201), false],
	])("%j → %s", (value, expected) => {
		expect(isValidIssuedClientId(value)).toBe(expected);
	});
});

describe("createAuthorizationRequest", () => {
	it("registers dynamically when no client id is known", async () => {
		const request = await createAuthorizationRequest({
			clientId: null,
			hostId: "urn:uuid:host",
			redirectUri: "http://127.0.0.1:3000/ai/chatgpt/callback",
		});
		const url = new URL(request.url);

		expect(`${url.origin}${url.pathname}`).toBe(CHATGPT_AUTHORIZE_URL);
		expect(url.searchParams.get("client_id")).toBe(DYNAMIC_CLIENT_ID);
		expect(url.searchParams.get("agent_name_hint")).toBe("HackerFeed");
		expect(url.searchParams.get("ext_agent_host_id")).toBe("urn:uuid:host");
		expect(url.searchParams.get("response_type")).toBe("code");
		expect(url.searchParams.get("scope")).toBe(CHATGPT_SCOPES);
		expect(url.searchParams.get("scope")).toContain(
			"chatgpt.tokens.use.direct",
		);
		expect(url.searchParams.get("resource")).toBe(CHATGPT_RESOURCE);
		expect(url.searchParams.get("redirect_uri")).toBe(
			"http://127.0.0.1:3000/ai/chatgpt/callback",
		);
		expect(url.searchParams.get("state")).toBe(request.state);
		expect(url.searchParams.get("nonce")).toBe(request.nonce);
		expect(url.searchParams.get("code_challenge_method")).toBe("S256");
		expect(url.searchParams.get("code_challenge")).toBe(
			await createCodeChallenge(request.codeVerifier),
		);
		expect(url.searchParams.has("login_hint")).toBe(false);
	});

	it("reuses a known client id without a registration hint", async () => {
		const request = await createAuthorizationRequest({
			clientId: CLIENT_ID,
			hostId: "urn:uuid:host",
			loginHint: "reader@example.com",
			redirectUri: "https://hackerfeed.example.com/ai/chatgpt/callback",
		});
		const url = new URL(request.url);

		expect(url.searchParams.get("client_id")).toBe(CLIENT_ID);
		expect(url.searchParams.has("agent_name_hint")).toBe(false);
		expect(url.searchParams.get("login_hint")).toBe("reader@example.com");
	});

	it("generates fresh, high-entropy state, nonce, and verifier each time", async () => {
		const input = {
			clientId: null,
			hostId: "h",
			redirectUri: "http://127.0.0.1/cb",
		};
		const first = await createAuthorizationRequest(input);
		const second = await createAuthorizationRequest(input);

		expect(first.state).not.toBe(second.state);
		expect(first.nonce).not.toBe(second.nonce);
		expect(first.codeVerifier).not.toBe(second.codeVerifier);
		expect(first.codeVerifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
	});
});

describe("exchangeAuthorizationCode", () => {
	it("posts a form-encoded authorization_code grant with the resource", async () => {
		const fetch = vi.fn().mockResolvedValue(jsonResponse(tokenBody()));
		const before = Date.now();

		const tokens = await exchangeAuthorizationCode(
			{
				clientId: CLIENT_ID,
				code: "code-1",
				codeVerifier: "verifier-1",
				redirectUri: "http://127.0.0.1:3000/ai/chatgpt/callback",
			},
			{ fetch },
		);

		const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
		const body = init.body as URLSearchParams;
		expect(url).toBe(CHATGPT_TOKEN_URL);
		expect(init.method).toBe("POST");
		expect(new Headers(init.headers).get("content-type")).toBe(
			"application/x-www-form-urlencoded",
		);
		expect(new Headers(init.headers).has("authorization")).toBe(false);
		expect(Object.fromEntries(body)).toEqual({
			grant_type: "authorization_code",
			client_id: CLIENT_ID,
			code: "code-1",
			code_verifier: "verifier-1",
			redirect_uri: "http://127.0.0.1:3000/ai/chatgpt/callback",
			resource: CHATGPT_RESOURCE,
		});
		expect(tokens).toMatchObject({
			accessToken: "access-1",
			refreshToken: "refresh-1",
			idToken: "id-token-1",
		});
		expect(tokens.scopes).toContain("chatgpt.tokens.use.direct");
		expect(tokens.expiresAt).toBeGreaterThanOrEqual(before + 3_600_000);
	});

	it("uses client_secret_basic for confidential clients", async () => {
		const fetch = vi.fn().mockResolvedValue(jsonResponse(tokenBody()));

		await exchangeAuthorizationCode(
			{ clientId: CLIENT_ID, code: "c", codeVerifier: "v", redirectUri: "r" },
			{ fetch, clientSecret: "s3cret" },
		);

		const init = fetch.mock.calls[0][1] as RequestInit;
		expect(new Headers(init.headers).get("authorization")).toBe(
			`Basic ${btoa(`${CLIENT_ID}:s3cret`)}`,
		);
		expect((init.body as URLSearchParams).has("client_secret")).toBe(false);
	});

	it("requires an ID token", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(jsonResponse(tokenBody({ id_token: undefined })));

		await expect(
			exchangeAuthorizationCode(
				{ clientId: CLIENT_ID, code: "c", codeVerifier: "v", redirectUri: "r" },
				{ fetch },
			),
		).rejects.toMatchObject({ code: "invalid_id_token" });
	});

	it.each([
		["missing access token", { access_token: undefined }],
		["non-bearer token type", { token_type: "mac" }],
		["non-positive expiry", { expires_in: 0 }],
		["missing scope", { scope: undefined }],
	])("rejects incomplete credentials: %s", async (_label, overrides) => {
		const fetch = vi.fn().mockResolvedValue(jsonResponse(tokenBody(overrides)));

		await expect(
			exchangeAuthorizationCode(
				{ clientId: CLIENT_ID, code: "c", codeVerifier: "v", redirectUri: "r" },
				{ fetch },
			),
		).rejects.toMatchObject({ code: "invalid_token_response" });
	});

	it("maps OAuth error responses", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(jsonResponse({ error: "invalid_grant" }, 400));

		await expect(
			exchangeAuthorizationCode(
				{ clientId: CLIENT_ID, code: "c", codeVerifier: "v", redirectUri: "r" },
				{ fetch },
			),
		).rejects.toMatchObject({ code: "invalid_grant", status: 400 });
	});

	it("maps network failures to a retryable error", async () => {
		const fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

		await expect(
			exchangeAuthorizationCode(
				{ clientId: CLIENT_ID, code: "c", codeVerifier: "v", redirectUri: "r" },
				{ fetch },
			),
		).rejects.toMatchObject({ code: "network_error", retryable: true });
	});

	it("rejects non-object JSON bodies", async () => {
		const fetch = vi.fn().mockResolvedValue(jsonResponse(["nope"]));

		await expect(
			exchangeAuthorizationCode(
				{ clientId: CLIENT_ID, code: "c", codeVerifier: "v", redirectUri: "r" },
				{ fetch },
			),
		).rejects.toBeInstanceOf(AiProviderError);
	});
});

describe("refreshAccessToken", () => {
	it("posts a refresh_token grant and returns rotated tokens", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(
				jsonResponse(
					tokenBody({ access_token: "access-2", refresh_token: "refresh-2" }),
				),
			);

		const tokens = await refreshAccessToken(
			{ clientId: CLIENT_ID, refreshToken: "refresh-1", scopes: [] },
			{ fetch },
		);

		const body = (fetch.mock.calls[0][1] as RequestInit)
			.body as URLSearchParams;
		expect(Object.fromEntries(body)).toEqual({
			grant_type: "refresh_token",
			client_id: CLIENT_ID,
			refresh_token: "refresh-1",
			resource: CHATGPT_RESOURCE,
		});
		expect(tokens.accessToken).toBe("access-2");
		expect(tokens.refreshToken).toBe("refresh-2");
	});

	it("keeps the previous refresh token and scopes when omitted", async () => {
		const fetch = vi.fn().mockResolvedValue(
			jsonResponse(
				tokenBody({
					refresh_token: undefined,
					scope: undefined,
					id_token: undefined,
				}),
			),
		);

		const tokens = await refreshAccessToken(
			{
				clientId: CLIENT_ID,
				refreshToken: "refresh-1",
				scopes: ["openid", "chatgpt.tokens.use.direct"],
			},
			{ fetch },
		);

		expect(tokens.refreshToken).toBe("refresh-1");
		expect(tokens.scopes).toEqual(["openid", "chatgpt.tokens.use.direct"]);
		expect(tokens.idToken).toBeNull();
	});
});

describe("verifyIdToken", () => {
	const config = () => ({ getSigningKey: async () => keys.publicKey });

	it("returns the verified identity", async () => {
		const token = await signIdToken({ nonce: "n-1" });

		await expect(
			verifyIdToken(token, { clientId: CLIENT_ID, nonce: "n-1" }, config()),
		).resolves.toEqual({
			subject: "user-sub-1",
			email: "reader@example.com",
			name: "Reader",
		});
	});

	it("tolerates missing profile claims", async () => {
		const token = await signIdToken({ email: undefined, name: undefined });

		await expect(
			verifyIdToken(token, { clientId: CLIENT_ID }, config()),
		).resolves.toEqual({ subject: "user-sub-1", email: null, name: null });
	});

	it.each([
		["wrong nonce", { nonce: "other" }, {}],
		["wrong audience", { nonce: "n-1" }, { audience: "oaiapp_other" }],
		["wrong issuer", { nonce: "n-1" }, { issuer: "https://evil.example.com" }],
		["expired", { nonce: "n-1" }, { expiresIn: "-1h" }],
		["foreign azp", { nonce: "n-1", azp: "oaiapp_other" }, {}],
	])("rejects tokens with %s", async (_label, claims, options) => {
		const token = await signIdToken(claims, options);

		await expect(
			verifyIdToken(token, { clientId: CLIENT_ID, nonce: "n-1" }, config()),
		).rejects.toMatchObject({ code: "invalid_id_token" });
	});

	it("rejects tokens signed by another key", async () => {
		const other = await generateKeyPair("RS256");
		const token = await signIdToken({ nonce: "n-1" });

		await expect(
			verifyIdToken(
				token,
				{ clientId: CLIENT_ID, nonce: "n-1" },
				{ getSigningKey: async () => other.publicKey },
			),
		).rejects.toMatchObject({ code: "invalid_id_token" });
	});

	it("rejects garbage", async () => {
		await expect(
			verifyIdToken("not-a-jwt", { clientId: CLIENT_ID }, config()),
		).rejects.toMatchObject({ code: "invalid_id_token" });
	});
});

describe("revokeRefreshToken", () => {
	it("posts the refresh token to the discovered revocation endpoint", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValueOnce(
				jsonResponse({ revocation_endpoint: `${CHATGPT_ISSUER}/oauth/revoke` }),
			)
			.mockResolvedValueOnce(new Response(null, { status: 200 }));

		await expect(
			revokeRefreshToken(
				{ clientId: CLIENT_ID, refreshToken: "r-1" },
				{ fetch },
			),
		).resolves.toBe(true);

		const [url, init] = fetch.mock.calls[1] as [string, RequestInit];
		expect(url).toBe(`${CHATGPT_ISSUER}/oauth/revoke`);
		expect(Object.fromEntries(init.body as URLSearchParams)).toEqual({
			token: "r-1",
			token_type_hint: "refresh_token",
			client_id: CLIENT_ID,
		});
	});

	it("refuses revocation endpoints on other origins", async () => {
		const fetch = vi.fn().mockResolvedValue(
			jsonResponse({
				revocation_endpoint: "https://evil.example.com/revoke",
			}),
		);

		await expect(
			revokeRefreshToken(
				{ clientId: CLIENT_ID, refreshToken: "r-1" },
				{ fetch },
			),
		).resolves.toBe(false);
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it("never throws", async () => {
		const fetch = vi.fn().mockRejectedValue(new Error("down"));

		await expect(
			revokeRefreshToken(
				{ clientId: CLIENT_ID, refreshToken: "r-1" },
				{ fetch },
			),
		).resolves.toBe(false);
	});
});
