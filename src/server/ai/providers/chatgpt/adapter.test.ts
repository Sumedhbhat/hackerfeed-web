import { generateKeyPair, SignJWT } from "jose";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { CHATGPT_PROVIDER_ID, createChatGptAdapter } from "./adapter";
import {
	CHATGPT_ISSUER,
	CHATGPT_SCOPES,
	CHATGPT_TOKEN_URL,
	DYNAMIC_CLIENT_ID,
} from "./oauth";

const LOOPBACK = "http://127.0.0.1:3000/ai/chatgpt/callback";
const HOSTED = "https://hackerfeed.example.com/ai/chatgpt/callback";
const ISSUED = "oaiapp_issued";

let keys: Awaited<ReturnType<typeof generateKeyPair>>;
beforeAll(async () => {
	keys = await generateKeyPair("RS256");
});

function idToken({
	audience = ISSUED,
	nonce,
	subject = "chatgpt-sub",
}: {
	audience?: string;
	nonce?: string;
	subject?: string;
} = {}) {
	return new SignJWT({ email: "reader@example.com", name: "Reader", nonce })
		.setProtectedHeader({ alg: "RS256" })
		.setIssuer(CHATGPT_ISSUER)
		.setAudience(audience)
		.setSubject(subject)
		.setIssuedAt()
		.setExpirationTime("1h")
		.sign(keys.privateKey);
}

function tokenResponse(overrides: Record<string, unknown> = {}) {
	return Response.json({
		access_token: "access-new",
		refresh_token: "refresh-new",
		token_type: "Bearer",
		expires_in: 3600,
		scope: CHATGPT_SCOPES,
		...overrides,
	});
}

function adapter(
	fetch = vi.fn(),
	config: { clientId?: string; clientSecret?: string } = {},
) {
	return {
		fetch,
		adapter: createChatGptAdapter({
			...config,
			fetch: fetch as unknown as typeof globalThis.fetch,
			getSigningKey: async () => keys.publicKey,
		}),
	};
}

function pending(overrides: Record<string, string | null> = {}) {
	return {
		clientId: null,
		codeVerifier: "verifier",
		hostId: "urn:uuid:host",
		nonce: "nonce-1",
		...overrides,
	};
}

describe("ChatGPT adapter", () => {
	it("uses the chatgpt catalog id", () => {
		expect(adapter().adapter.id).toBe(CHATGPT_PROVIDER_ID);
		expect(CHATGPT_PROVIDER_ID).toBe("chatgpt");
	});

	describe("canAuthorize", () => {
		it("allows only loopback redirects without a configured client id", () => {
			const { adapter: chatgpt } = adapter();

			expect(chatgpt.canAuthorize(LOOPBACK)).toBe(true);
			expect(chatgpt.canAuthorize(HOSTED)).toBe(false);
		});

		it("allows hosted redirects with a configured client id", () => {
			const { adapter: chatgpt } = adapter(vi.fn(), {
				clientId: "oaiapp_configured",
			});

			expect(chatgpt.canAuthorize(HOSTED)).toBe(true);
		});
	});

	describe("createAuthorization", () => {
		it("starts dynamic registration with a fresh host id", async () => {
			const { adapter: chatgpt } = adapter();

			const result = await chatgpt.createAuthorization({
				registration: null,
				redirectUri: LOOPBACK,
				loginHint: null,
			});

			const params = new URL(result.url).searchParams;
			expect(params.get("client_id")).toBe(DYNAMIC_CLIENT_ID);
			expect(params.get("agent_name_hint")).toBe("HackerFeed");
			expect(params.get("state")).toBe(result.state);
			expect(params.get("redirect_uri")).toBe(LOOPBACK);
			expect(result.pending.clientId).toBeNull();
			expect(result.pending.hostId).toMatch(/^urn:uuid:[0-9a-f-]{36}$/);
			expect(params.get("ext_agent_host_id")).toBe(result.pending.hostId);
			expect(params.get("nonce")).toBe(result.pending.nonce);
			expect(result.pending.codeVerifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
		});

		it("reuses a stored registration and hints the account", async () => {
			const { adapter: chatgpt } = adapter();

			const result = await chatgpt.createAuthorization({
				registration: {
					clientId: ISSUED,
					metadata: { hostId: "urn:uuid:existing" },
				},
				redirectUri: LOOPBACK,
				loginHint: "reader@example.com",
			});

			const params = new URL(result.url).searchParams;
			expect(params.get("client_id")).toBe(ISSUED);
			expect(params.has("agent_name_hint")).toBe(false);
			expect(params.get("login_hint")).toBe("reader@example.com");
			expect(result.pending).toMatchObject({
				clientId: ISSUED,
				hostId: "urn:uuid:existing",
			});
		});

		it("prefers a configured client id", async () => {
			const { adapter: chatgpt } = adapter(vi.fn(), {
				clientId: "oaiapp_configured",
			});

			const result = await chatgpt.createAuthorization({
				registration: { clientId: ISSUED, metadata: {} },
				redirectUri: HOSTED,
				loginHint: null,
			});

			expect(result.pending.clientId).toBe("oaiapp_configured");
		});

		it("refuses hosted redirects without a configured client id", async () => {
			const { adapter: chatgpt } = adapter();

			await expect(
				chatgpt.createAuthorization({
					registration: null,
					redirectUri: HOSTED,
					loginHint: null,
				}),
			).rejects.toMatchObject({ code: "provider_unavailable" });
		});
	});

	describe("completeAuthorization", () => {
		it("exchanges the code and returns the verified identity", async () => {
			const fetch = vi
				.fn()
				.mockResolvedValue(
					tokenResponse({ id_token: await idToken({ nonce: "nonce-1" }) }),
				);
			const { adapter: chatgpt } = adapter(fetch);

			const result = await chatgpt.completeAuthorization({
				callback: new URLSearchParams({ code: "code-1", client_id: ISSUED }),
				pending: pending(),
				redirectUri: LOOPBACK,
			});

			const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
			const body = init.body as URLSearchParams;
			expect(url).toBe(CHATGPT_TOKEN_URL);
			expect(body.get("client_id")).toBe(ISSUED);
			expect(body.get("code")).toBe("code-1");
			expect(body.get("code_verifier")).toBe("verifier");
			expect(body.get("redirect_uri")).toBe(LOOPBACK);
			expect(result).toEqual({
				registration: {
					clientId: ISSUED,
					metadata: { hostId: "urn:uuid:host" },
				},
				identity: {
					subject: "chatgpt-sub",
					email: "reader@example.com",
					name: "Reader",
				},
				tokens: expect.objectContaining({
					accessToken: "access-new",
					refreshToken: "refresh-new",
				}),
			});
			expect(result.tokens).not.toHaveProperty("idToken");
		});

		it("accepts a known client id when the callback omits it", async () => {
			const fetch = vi
				.fn()
				.mockResolvedValue(
					tokenResponse({ id_token: await idToken({ nonce: "nonce-1" }) }),
				);
			const { adapter: chatgpt } = adapter(fetch);

			const result = await chatgpt.completeAuthorization({
				callback: new URLSearchParams({ code: "c" }),
				pending: pending({ clientId: ISSUED }),
				redirectUri: LOOPBACK,
			});

			expect(result.registration.clientId).toBe(ISSUED);
		});

		it.each([
			["no issued client id", pending(), {}],
			["the dynamic placeholder", pending(), { client_id: DYNAMIC_CLIENT_ID }],
			[
				"a mismatched client id",
				pending({ clientId: ISSUED }),
				{ client_id: "oaiapp_other" },
			],
			[
				"missing pending verifier",
				pending({ codeVerifier: null }),
				{ client_id: ISSUED },
			],
		])("rejects %s before calling OpenAI", async (_label, flow, params) => {
			const { adapter: chatgpt, fetch } = adapter();

			await expect(
				chatgpt.completeAuthorization({
					callback: new URLSearchParams({ code: "c", ...params }),
					pending: flow,
					redirectUri: LOOPBACK,
				}),
			).rejects.toMatchObject({ code: "registration_incomplete" });
			expect(fetch).not.toHaveBeenCalled();
		});

		it("rejects duplicated client ids", async () => {
			const { adapter: chatgpt } = adapter();
			const callback = new URLSearchParams("code=c&client_id=a&client_id=b");

			await expect(
				chatgpt.completeAuthorization({
					callback,
					pending: pending(),
					redirectUri: LOOPBACK,
				}),
			).rejects.toMatchObject({ code: "registration_incomplete" });
		});

		it("rejects an ID token with the wrong nonce", async () => {
			const fetch = vi
				.fn()
				.mockResolvedValue(
					tokenResponse({ id_token: await idToken({ nonce: "replayed" }) }),
				);
			const { adapter: chatgpt } = adapter(fetch);

			await expect(
				chatgpt.completeAuthorization({
					callback: new URLSearchParams({ code: "c", client_id: ISSUED }),
					pending: pending(),
					redirectUri: LOOPBACK,
				}),
			).rejects.toMatchObject({ code: "invalid_id_token" });
		});

		it("requires the plan usage scope", async () => {
			const fetch = vi.fn().mockResolvedValue(
				tokenResponse({
					scope: "openid profile email",
					id_token: await idToken({ nonce: "nonce-1" }),
				}),
			);
			const { adapter: chatgpt } = adapter(fetch);

			await expect(
				chatgpt.completeAuthorization({
					callback: new URLSearchParams({ code: "c", client_id: ISSUED }),
					pending: pending(),
					redirectUri: LOOPBACK,
				}),
			).rejects.toMatchObject({ code: "plan_usage_not_granted" });
		});
	});

	describe("refresh", () => {
		const registration = { clientId: ISSUED, metadata: { hostId: "h" } };

		it("returns rotated tokens and the re-asserted identity", async () => {
			const fetch = vi
				.fn()
				.mockResolvedValue(tokenResponse({ id_token: await idToken() }));
			const { adapter: chatgpt } = adapter(fetch);

			const result = await chatgpt.refresh({
				registration,
				refreshToken: "refresh-old",
				scopes: [],
			});

			const body = (fetch.mock.calls[0][1] as RequestInit)
				.body as URLSearchParams;
			expect(body.get("grant_type")).toBe("refresh_token");
			expect(body.get("refresh_token")).toBe("refresh-old");
			expect(result.tokens.accessToken).toBe("access-new");
			expect(result.identity?.subject).toBe("chatgpt-sub");
		});

		it("returns no identity when the refresh has no ID token", async () => {
			const fetch = vi.fn().mockResolvedValue(tokenResponse());
			const { adapter: chatgpt } = adapter(fetch);

			const result = await chatgpt.refresh({
				registration,
				refreshToken: "r",
				scopes: [],
			});

			expect(result.identity).toBeNull();
		});

		it("marks a lost plan scope as requiring reconnect", async () => {
			const fetch = vi
				.fn()
				.mockResolvedValue(tokenResponse({ scope: "openid" }));
			const { adapter: chatgpt } = adapter(fetch);

			await expect(
				chatgpt.refresh({ registration, refreshToken: "r", scopes: [] }),
			).rejects.toMatchObject({
				code: "plan_usage_not_granted",
				requiresReconnect: true,
			});
		});

		it("marks rejected refresh tokens as requiring reconnect", async () => {
			const fetch = vi
				.fn()
				.mockResolvedValue(
					Response.json({ error: "refresh_token_reused" }, { status: 400 }),
				);
			const { adapter: chatgpt } = adapter(fetch);

			await expect(
				chatgpt.refresh({ registration, refreshToken: "r", scopes: [] }),
			).rejects.toMatchObject({ requiresReconnect: true });
		});

		it("requires a client id", async () => {
			const { adapter: chatgpt, fetch } = adapter();

			await expect(
				chatgpt.refresh({
					registration: { clientId: null, metadata: {} },
					refreshToken: "r",
					scopes: [],
				}),
			).rejects.toMatchObject({ requiresReconnect: true });
			expect(fetch).not.toHaveBeenCalled();
		});
	});

	it("revokes the refresh token and never throws", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValueOnce(
				Response.json({
					revocation_endpoint: `${CHATGPT_ISSUER}/oauth/revoke`,
				}),
			)
			.mockResolvedValueOnce(new Response(null, { status: 200 }));
		const { adapter: chatgpt } = adapter(fetch);

		await chatgpt.revoke({
			registration: { clientId: ISSUED, metadata: {} },
			refreshToken: "r-1",
		});

		expect((fetch.mock.calls[1][1] as RequestInit).body).toEqual(
			new URLSearchParams({
				token: "r-1",
				token_type_hint: "refresh_token",
				client_id: ISSUED,
			}),
		);

		const failing = adapter(vi.fn().mockRejectedValue(new Error("down")));
		await expect(
			failing.adapter.revoke({
				registration: { clientId: ISSUED, metadata: {} },
				refreshToken: "r",
			}),
		).resolves.toBeUndefined();
	});

	it("lists models and streams replies with the access token", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValueOnce(
				Response.json({
					models: [{ slug: "m", display_name: "M", visibility: "list" }],
				}),
			)
			.mockResolvedValueOnce(
				new Response(
					'data: {"type":"response.output_text.delta","delta":"Hi"}\n\ndata: {"type":"response.completed"}\n\n',
				),
			);
		const { adapter: chatgpt } = adapter(fetch);

		await expect(chatgpt.listModels("token-1")).resolves.toEqual([
			{ slug: "m", displayName: "M" },
		]);
		const deltas: string[] = [];
		for await (const delta of chatgpt.streamReply("token-1", {
			instructions: "ctx",
			messages: [{ role: "user", content: "hi" }],
			model: "m",
		})) {
			deltas.push(delta);
		}

		expect(deltas).toEqual(["Hi"]);
		for (const [, init] of fetch.mock.calls as [string, RequestInit][]) {
			expect(new Headers(init.headers).get("authorization")).toBe(
				"Bearer token-1",
			);
		}
	});
});
