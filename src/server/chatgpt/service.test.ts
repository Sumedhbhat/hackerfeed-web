import { generateKeyPair, SignJWT } from "jose";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
	CHATGPT_ISSUER,
	CHATGPT_SCOPES,
	CHATGPT_TOKEN_URL,
	DYNAMIC_CLIENT_ID,
} from "./oauth";
import type {
	ChatGptConnectionRow,
	SaveChatGptConnectionInput,
	UpdateChatGptTokensInput,
} from "./repository";
import { type ChatGptAuthorizationFlow, createChatGptService } from "./service";
import { createTokenCipher } from "./token-crypto";

const USER = { workosUserId: "workos-1" };
const LOOPBACK = "http://127.0.0.1:3000/chatgpt/callback";
const HOSTED = "https://hackerfeed.example.com/chatgpt/callback";
const ISSUED_CLIENT = "oaiapp_issued";

let keys: Awaited<ReturnType<typeof generateKeyPair>>;
beforeAll(async () => {
	keys = await generateKeyPair("RS256");
});

function idToken({
	audience = ISSUED_CLIENT,
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

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status });
}

function createConnections(initial?: Partial<ChatGptConnectionRow>) {
	let row: ChatGptConnectionRow | null = initial
		? {
				id: "conn-1",
				appUserId: "app-user-1",
				clientId: ISSUED_CLIENT,
				hostId: "urn:uuid:existing-host",
				subject: "chatgpt-sub",
				email: "reader@example.com",
				name: "Reader",
				accessToken: null,
				refreshToken: null,
				accessTokenExpiresAt: null,
				scopes: "",
				createdAt: "now",
				updatedAt: "now",
				...initial,
			}
		: null;

	return {
		get row() {
			return row;
		},
		findByAppUserId: vi.fn(async () => row),
		save: vi.fn(
			async (appUserId: string, input: SaveChatGptConnectionInput) => {
				row = {
					id: "conn-1",
					createdAt: "now",
					updatedAt: "now",
					appUserId,
					...input,
				};
			},
		),
		updateTokens: vi.fn(
			async (_id: string, input: UpdateChatGptTokensInput) => {
				if (row) row = { ...row, ...input };
			},
		),
		clearTokens: vi.fn(async () => {
			if (row) {
				row = {
					...row,
					accessToken: null,
					refreshToken: null,
					accessTokenExpiresAt: null,
					scopes: "",
				};
			}
		}),
	};
}

async function setup({
	clientId,
	connection,
	fetch = vi.fn(),
}: {
	clientId?: string;
	connection?: Partial<ChatGptConnectionRow>;
	fetch?: ReturnType<typeof vi.fn>;
} = {}) {
	const cipher = createTokenCipher("test-secret-that-is-long-enough-123");
	const connections = createConnections(connection);
	const users = {
		getOrCreateAppUser: vi.fn(async () => ({ id: "app-user-1" })),
	};
	const service = createChatGptService({
		cipher,
		connections,
		oauth: { clientId, getSigningKey: async () => keys.publicKey },
		users,
		fetch: fetch as unknown as typeof globalThis.fetch,
	});
	return { cipher, connections, fetch, service, users };
}

async function connectedRow(
	cipher: ReturnType<typeof createTokenCipher>,
	overrides: Partial<ChatGptConnectionRow> = {},
): Promise<Partial<ChatGptConnectionRow>> {
	return {
		accessToken: await cipher.encrypt("access-old"),
		refreshToken: await cipher.encrypt("refresh-old"),
		accessTokenExpiresAt: Date.now() + 3_600_000,
		scopes: CHATGPT_SCOPES,
		...overrides,
	};
}

/** Builds a service whose stored connection is sealed with the service's own cipher. */
async function setupConnected(
	overrides: Partial<ChatGptConnectionRow> = {},
	fetch = vi.fn(),
) {
	const probe = createTokenCipher("test-secret-that-is-long-enough-123");
	return setup({
		connection: await connectedRow(probe, overrides),
		fetch,
	});
}

function tokenResponse(overrides: Record<string, unknown> = {}) {
	return {
		access_token: "access-new",
		refresh_token: "refresh-new",
		token_type: "Bearer",
		expires_in: 3600,
		scope: CHATGPT_SCOPES,
		...overrides,
	};
}

function sseResponse(...events: unknown[]) {
	return new Response(
		events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""),
		{ headers: { "content-type": "text/event-stream" } },
	);
}

async function collect(iterable: AsyncIterable<string>) {
	const items: string[] = [];
	for await (const item of iterable) items.push(item);
	return items;
}

describe("getStatus", () => {
	it("reports not connected and connectability", async () => {
		const { service } = await setup();

		await expect(service.getStatus(USER, LOOPBACK)).resolves.toEqual({
			canConnect: true,
			connected: false,
			email: null,
			name: null,
		});
		await expect(service.getStatus(USER, HOSTED)).resolves.toMatchObject({
			canConnect: false,
		});
	});

	it("allows hosted redirects with a configured client id", async () => {
		const { service } = await setup({ clientId: "oaiapp_configured" });

		await expect(service.getStatus(USER, HOSTED)).resolves.toMatchObject({
			canConnect: true,
		});
	});

	it("reports the connected account", async () => {
		const { service } = await setupConnected();

		await expect(service.getStatus(USER, LOOPBACK)).resolves.toEqual({
			canConnect: true,
			connected: true,
			email: "reader@example.com",
			name: "Reader",
		});
	});

	it("hides identity details for a disconnected registration", async () => {
		const { service } = await setup({ connection: {} });

		await expect(service.getStatus(USER, LOOPBACK)).resolves.toMatchObject({
			connected: false,
			email: null,
		});
	});

	it("requires a HackerFeed user", async () => {
		const { service } = await setup();

		await expect(service.getStatus(null, LOOPBACK)).rejects.toThrow(
			"Authentication required",
		);
	});
});

describe("startAuthorization", () => {
	it("starts dynamic registration for a new user on loopback", async () => {
		const { service } = await setup();

		const { flow, url } = await service.startAuthorization(USER, {
			redirectUri: LOOPBACK,
			returnTo: "/chat/1",
		});

		const params = new URL(url).searchParams;
		expect(params.get("client_id")).toBe(DYNAMIC_CLIENT_ID);
		expect(params.get("redirect_uri")).toBe(LOOPBACK);
		expect(params.get("state")).toBe(flow.state);
		expect(flow).toMatchObject({
			clientId: null,
			redirectUri: LOOPBACK,
			returnTo: "/chat/1",
			workosUserId: "workos-1",
		});
		expect(flow.hostId).toMatch(/^urn:uuid:[0-9a-f-]{36}$/);
		expect(params.get("ext_agent_host_id")).toBe(flow.hostId);
	});

	it("reuses an existing registration and hints the known account", async () => {
		const { service } = await setup({ connection: {} });

		const { flow, url } = await service.startAuthorization(USER, {
			redirectUri: LOOPBACK,
			returnTo: "/profile",
		});

		const params = new URL(url).searchParams;
		expect(params.get("client_id")).toBe(ISSUED_CLIENT);
		expect(params.get("login_hint")).toBe("reader@example.com");
		expect(flow.clientId).toBe(ISSUED_CLIENT);
		expect(flow.hostId).toBe("urn:uuid:existing-host");
	});

	it("prefers a configured client id", async () => {
		const { service } = await setup({
			clientId: "oaiapp_configured",
			connection: {},
		});

		const { flow } = await service.startAuthorization(USER, {
			redirectUri: HOSTED,
			returnTo: "/profile",
		});

		expect(flow.clientId).toBe("oaiapp_configured");
	});

	it("refuses hosted redirects without a configured client id", async () => {
		const { service } = await setup();

		await expect(
			service.startAuthorization(USER, { redirectUri: HOSTED, returnTo: "/" }),
		).rejects.toMatchObject({ code: "chatgpt_unavailable" });
	});
});

describe("completeAuthorization", () => {
	function flow(overrides: Partial<ChatGptAuthorizationFlow> = {}) {
		return {
			clientId: null,
			codeVerifier: "verifier",
			hostId: "urn:uuid:new-host",
			nonce: "nonce-1",
			redirectUri: LOOPBACK,
			returnTo: "/profile",
			state: "state-1",
			workosUserId: "workos-1",
			...overrides,
		};
	}

	it("exchanges the code, verifies identity, and stores sealed tokens", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(
				json(tokenResponse({ id_token: await idToken({ nonce: "nonce-1" }) })),
			);
		const { cipher, connections, service } = await setup({ fetch });

		await service.completeAuthorization(USER, flow(), {
			code: "code-1",
			clientId: ISSUED_CLIENT,
		});

		const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
		expect(url).toBe(CHATGPT_TOKEN_URL);
		expect((init.body as URLSearchParams).get("client_id")).toBe(ISSUED_CLIENT);
		expect((init.body as URLSearchParams).get("code_verifier")).toBe(
			"verifier",
		);

		const row = connections.row;
		expect(row).toMatchObject({
			appUserId: "app-user-1",
			clientId: ISSUED_CLIENT,
			hostId: "urn:uuid:new-host",
			subject: "chatgpt-sub",
			email: "reader@example.com",
			name: "Reader",
			scopes: CHATGPT_SCOPES,
		});
		expect(row?.accessToken).not.toBe("access-new");
		await expect(cipher.decrypt(row?.accessToken ?? "")).resolves.toBe(
			"access-new",
		);
		await expect(cipher.decrypt(row?.refreshToken ?? "")).resolves.toBe(
			"refresh-new",
		);
	});

	it("rejects callbacks for a different HackerFeed user", async () => {
		const { fetch, service } = await setup();

		await expect(
			service.completeAuthorization({ workosUserId: "someone-else" }, flow(), {
				code: "c",
				clientId: ISSUED_CLIENT,
			}),
		).rejects.toMatchObject({ code: "session_mismatch" });
		expect(fetch).not.toHaveBeenCalled();
	});

	it.each([
		["no issued client id", null, null],
		["the dynamic placeholder", null, DYNAMIC_CLIENT_ID],
		["a mismatched client id", ISSUED_CLIENT, "oaiapp_other"],
	])("rejects %s", async (_label, flowClientId, returned) => {
		const { fetch, service } = await setup();

		await expect(
			service.completeAuthorization(USER, flow({ clientId: flowClientId }), {
				code: "c",
				clientId: returned,
			}),
		).rejects.toMatchObject({ code: "registration_incomplete" });
		expect(fetch).not.toHaveBeenCalled();
	});

	it("accepts a known client id when the callback omits it", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(
				json(tokenResponse({ id_token: await idToken({ nonce: "nonce-1" }) })),
			);
		const { connections, service } = await setup({ fetch });

		await service.completeAuthorization(
			USER,
			flow({ clientId: ISSUED_CLIENT }),
			{
				code: "c",
				clientId: null,
			},
		);

		expect(connections.row?.clientId).toBe(ISSUED_CLIENT);
	});

	it("rejects an ID token with the wrong nonce", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(
				json(tokenResponse({ id_token: await idToken({ nonce: "replayed" }) })),
			);
		const { connections, service } = await setup({ fetch });

		await expect(
			service.completeAuthorization(USER, flow(), {
				code: "c",
				clientId: ISSUED_CLIENT,
			}),
		).rejects.toMatchObject({ code: "invalid_id_token" });
		expect(connections.save).not.toHaveBeenCalled();
	});

	it("requires the plan usage scope to be granted", async () => {
		const fetch = vi.fn().mockResolvedValue(
			json(
				tokenResponse({
					scope: "openid profile email",
					id_token: await idToken({ nonce: "nonce-1" }),
				}),
			),
		);
		const { connections, service } = await setup({ fetch });

		await expect(
			service.completeAuthorization(USER, flow(), {
				code: "c",
				clientId: ISSUED_CLIENT,
			}),
		).rejects.toMatchObject({ code: "plan_usage_not_granted" });
		expect(connections.save).not.toHaveBeenCalled();
	});
});

describe("access tokens", () => {
	it("uses a fresh stored token without refreshing", async () => {
		const fetch = vi.fn().mockResolvedValue(
			json({
				models: [{ slug: "m", display_name: "M", visibility: "list" }],
			}),
		);
		const { service } = await setupConnected({}, fetch);

		await expect(service.listModels(USER)).resolves.toEqual([
			{ slug: "m", displayName: "M" },
		]);
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(
			new Headers((fetch.mock.calls[0][1] as RequestInit).headers).get(
				"authorization",
			),
		).toBe("Bearer access-old");
	});

	it("refreshes tokens close to expiry and persists the rotation", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValueOnce(json(tokenResponse({ id_token: await idToken() })))
			.mockResolvedValueOnce(json({ models: [] }));
		const { cipher, connections, service } = await setupConnected(
			{ accessTokenExpiresAt: Date.now() + 30_000 },
			fetch,
		);

		await service.listModels(USER);

		const refreshBody = (fetch.mock.calls[0][1] as RequestInit)
			.body as URLSearchParams;
		expect(refreshBody.get("grant_type")).toBe("refresh_token");
		expect(refreshBody.get("refresh_token")).toBe("refresh-old");
		expect(
			new Headers((fetch.mock.calls[1][1] as RequestInit).headers).get(
				"authorization",
			),
		).toBe("Bearer access-new");
		await expect(
			cipher.decrypt(connections.row?.refreshToken ?? ""),
		).resolves.toBe("refresh-new");
	});

	it("disconnects when the refresh token is rejected", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(json({ error: "refresh_token_reused" }, 400));
		const { connections, service } = await setupConnected(
			{ accessTokenExpiresAt: 0 },
			fetch,
		);

		await expect(service.listModels(USER)).rejects.toMatchObject({
			code: "refresh_token_reused",
		});
		expect(connections.clearTokens).toHaveBeenCalled();
		expect(connections.row?.accessToken).toBeNull();
	});

	it("keeps the connection on transient refresh failures", async () => {
		const fetch = vi.fn().mockResolvedValue(json({}, 503));
		const { connections, service } = await setupConnected(
			{ accessTokenExpiresAt: 0 },
			fetch,
		);

		await expect(service.listModels(USER)).rejects.toMatchObject({
			retryable: true,
		});
		expect(connections.clearTokens).not.toHaveBeenCalled();
	});

	it("disconnects when a refresh returns a different account", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(
				json(tokenResponse({ id_token: await idToken({ subject: "other" }) })),
			);
		const { connections, service } = await setupConnected(
			{ accessTokenExpiresAt: 0 },
			fetch,
		);

		await expect(service.listModels(USER)).rejects.toMatchObject({
			code: "account_mismatch",
		});
		expect(connections.clearTokens).toHaveBeenCalled();
	});

	it("disconnects expired connections without a refresh token", async () => {
		const { connections, service } = await setupConnected({
			accessTokenExpiresAt: 0,
			refreshToken: null,
		});

		await expect(service.listModels(USER)).rejects.toMatchObject({
			code: "chatgpt_not_connected",
		});
		expect(connections.clearTokens).toHaveBeenCalled();
	});

	it("reports not connected without a stored token", async () => {
		const { service } = await setup({ connection: {} });

		await expect(service.listModels(USER)).rejects.toMatchObject({
			code: "chatgpt_not_connected",
		});
	});

	it("treats undecryptable tokens as not connected", async () => {
		const { service } = await setup({
			connection: {
				accessToken: "v1.garbage.garbage",
				accessTokenExpiresAt: Date.now() + 3_600_000,
			},
		});

		await expect(service.listModels(USER)).rejects.toMatchObject({
			code: "chatgpt_not_connected",
		});
	});
});

describe("startChat", () => {
	it("streams a reply with the user's access token", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(
				sseResponse(
					{ type: "response.output_text.delta", delta: "Hi " },
					{ type: "response.output_text.delta", delta: "there" },
					{ type: "response.completed" },
				),
			);
		const { service } = await setupConnected({}, fetch);

		const stream = await service.startChat(USER, {
			instructions: "ctx",
			messages: [{ role: "user", content: "hello" }],
			model: "gpt-test",
		});

		await expect(collect(stream)).resolves.toEqual(["Hi ", "there"]);
		const init = fetch.mock.calls[0][1] as RequestInit;
		expect(new Headers(init.headers).get("authorization")).toBe(
			"Bearer access-old",
		);
		expect(JSON.parse(init.body as string)).toMatchObject({
			instructions: "ctx",
			model: "gpt-test",
			store: false,
			stream: true,
		});
	});

	it("fails before streaming when not connected", async () => {
		const { fetch, service } = await setup();

		await expect(
			service.startChat(USER, {
				instructions: "",
				messages: [{ role: "user", content: "hi" }],
				model: "m",
			}),
		).rejects.toMatchObject({ code: "chatgpt_not_connected" });
		expect(fetch).not.toHaveBeenCalled();
	});
});

describe("disconnect", () => {
	it("clears tokens and revokes the refresh token", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValueOnce(
				json({ revocation_endpoint: `${CHATGPT_ISSUER}/oauth/revoke` }),
			)
			.mockResolvedValueOnce(new Response(null, { status: 200 }));
		const { connections, service } = await setupConnected({}, fetch);

		await service.disconnect(USER);

		expect(connections.row?.accessToken).toBeNull();
		expect(connections.row?.clientId).toBe(ISSUED_CLIENT);
		const revokeBody = (fetch.mock.calls[1][1] as RequestInit)
			.body as URLSearchParams;
		expect(revokeBody.get("token")).toBe("refresh-old");
	});

	it("still disconnects locally when revocation fails", async () => {
		const fetch = vi.fn().mockRejectedValue(new Error("offline"));
		const { connections, service } = await setupConnected({}, fetch);

		await service.disconnect(USER);

		expect(connections.row?.accessToken).toBeNull();
	});

	it("is a no-op when nothing is connected", async () => {
		const { connections, fetch, service } = await setup();

		await service.disconnect(USER);

		expect(connections.clearTokens).not.toHaveBeenCalled();
		expect(fetch).not.toHaveBeenCalled();
	});
});
