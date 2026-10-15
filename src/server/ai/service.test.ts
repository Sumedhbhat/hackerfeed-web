import { describe, expect, it, vi } from "vitest";
import { AiProviderError } from "./errors";
import type {
	AiProviderConnectionRow,
	AiProviderRow,
	SaveAiProviderConnectionInput,
	UpdateAiProviderTokensInput,
} from "./repository";
import { type AiAuthorizationFlow, createAiProviderService } from "./service";
import { createTokenCipher } from "./token-crypto";
import type { AiProviderAdapter } from "./types";

const USER = { workosUserId: "workos-1" };
const SECRET = "test-secret-that-is-long-enough-123";
const redirectUri = (id: string) => `http://127.0.0.1:3000/ai/${id}/callback`;

function providerRow(id: string, overrides: Partial<AiProviderRow> = {}) {
	return {
		id,
		name: id === "chatgpt" ? "ChatGPT" : "Claude",
		description: `Use your ${id} plan.`,
		manageUrl: `https://${id}.example.com/usage`,
		enabled: true,
		sortOrder: 0,
		createdAt: "now",
		updatedAt: "now",
		...overrides,
	} satisfies AiProviderRow;
}

function fakeAdapter(id: string, overrides: Partial<AiProviderAdapter> = {}) {
	return {
		id,
		canAuthorize: vi.fn(() => true),
		createAuthorization: vi.fn(async () => ({
			url: `https://${id}.example.com/authorize?state=state-1`,
			state: "state-1",
			pending: { verifier: "v-1" },
		})),
		completeAuthorization: vi.fn(async () => ({
			registration: { clientId: `${id}-client`, metadata: { host: "h" } },
			identity: {
				subject: "sub-1",
				email: "reader@example.com",
				name: "Reader",
			},
			tokens: {
				accessToken: `${id}-access`,
				refreshToken: `${id}-refresh`,
				expiresAt: Date.now() + 3_600_000,
				scopes: ["chat"],
			},
		})),
		refresh: vi.fn(async () => ({
			tokens: {
				accessToken: `${id}-access-new`,
				refreshToken: `${id}-refresh-new`,
				expiresAt: Date.now() + 3_600_000,
				scopes: ["chat"],
			},
			identity: null,
		})),
		revoke: vi.fn(async () => undefined),
		listModels: vi.fn(async () => [
			{ slug: `${id}-model`, displayName: "Model" },
		]),
		streamReply: vi.fn(async function* () {
			yield "Hello";
		}),
		...overrides,
	} satisfies AiProviderAdapter;
}

function createRepository({
	providers = [providerRow("chatgpt")],
	connections = [] as AiProviderConnectionRow[],
} = {}) {
	const rows = [...connections];
	const find = (appUserId: string, providerId: string) =>
		rows.find(
			(row) => row.appUserId === appUserId && row.providerId === providerId,
		) ?? null;

	return {
		rows,
		find,
		listEnabledProviders: vi.fn(async () =>
			providers.filter((provider) => provider.enabled),
		),
		findEnabledProvider: vi.fn(
			async (id: string) =>
				providers.find((provider) => provider.id === id && provider.enabled) ??
				null,
		),
		listConnections: vi.fn(async (appUserId: string) =>
			rows.filter((row) => row.appUserId === appUserId),
		),
		findConnection: vi.fn(async (appUserId: string, providerId: string) =>
			find(appUserId, providerId),
		),
		saveConnection: vi.fn(
			async (
				appUserId: string,
				providerId: string,
				input: SaveAiProviderConnectionInput,
			) => {
				const existing = find(appUserId, providerId);
				if (existing) Object.assign(existing, input);
				else {
					rows.push({
						id: `conn-${rows.length + 1}`,
						appUserId,
						providerId,
						createdAt: "now",
						updatedAt: "now",
						...input,
					});
				}
			},
		),
		updateTokens: vi.fn(
			async (
				appUserId: string,
				providerId: string,
				input: UpdateAiProviderTokensInput,
			) => {
				const existing = find(appUserId, providerId);
				if (existing) Object.assign(existing, input);
			},
		),
		clearTokens: vi.fn(async (appUserId: string, providerId: string) => {
			const existing = find(appUserId, providerId);
			if (existing) {
				Object.assign(existing, {
					accessToken: null,
					refreshToken: null,
					accessTokenExpiresAt: null,
					scopes: "",
				});
			}
		}),
	};
}

async function connectionRow(
	providerId: string,
	overrides: Partial<AiProviderConnectionRow> = {},
): Promise<AiProviderConnectionRow> {
	const cipher = createTokenCipher(SECRET);
	return {
		id: `conn-${providerId}`,
		appUserId: "app-user-1",
		providerId,
		clientId: `${providerId}-client`,
		registrationMetadata: '{"host":"h"}',
		subject: "sub-1",
		email: "reader@example.com",
		name: "Reader",
		accessToken: await cipher.encrypt(`${providerId}-access-old`),
		refreshToken: await cipher.encrypt(`${providerId}-refresh-old`),
		accessTokenExpiresAt: Date.now() + 3_600_000,
		scopes: "chat",
		createdAt: "now",
		updatedAt: "now",
		...overrides,
	};
}

function setup({
	adapters = [fakeAdapter("chatgpt")],
	repository = createRepository(),
}: {
	adapters?: AiProviderAdapter[];
	repository?: ReturnType<typeof createRepository>;
} = {}) {
	const cipher = createTokenCipher(SECRET);
	const users = {
		getOrCreateAppUser: vi.fn(async () => ({ id: "app-user-1" })),
	};
	const service = createAiProviderService({
		adapters,
		cipher,
		repository,
		users,
	});
	return { cipher, repository, service, users };
}

function flow(
	overrides: Partial<AiAuthorizationFlow> = {},
): AiAuthorizationFlow {
	return {
		providerId: "chatgpt",
		state: "state-1",
		workosUserId: "workos-1",
		redirectUri: redirectUri("chatgpt"),
		returnTo: "/profile",
		pending: { verifier: "v-1" },
		...overrides,
	};
}

async function collect(iterable: AsyncIterable<string>) {
	const items: string[] = [];
	for await (const item of iterable) items.push(item);
	return items;
}

describe("listProviders", () => {
	it("lists catalog providers that have adapters, with connection state", async () => {
		const chatgpt = fakeAdapter("chatgpt");
		const claude = fakeAdapter("claude", {
			canAuthorize: vi.fn(() => false),
		});
		const repository = createRepository({
			providers: [
				providerRow("chatgpt"),
				providerRow("claude"),
				providerRow("orphan"),
			],
			connections: [await connectionRow("chatgpt")],
		});
		const { service } = setup({ adapters: [chatgpt, claude], repository });

		const providers = await service.listProviders(USER, redirectUri);

		expect(providers).toEqual([
			{
				id: "chatgpt",
				name: "ChatGPT",
				description: "Use your chatgpt plan.",
				manageUrl: "https://chatgpt.example.com/usage",
				canConnect: true,
				connected: true,
				account: { email: "reader@example.com", name: "Reader" },
			},
			{
				id: "claude",
				name: "Claude",
				description: "Use your claude plan.",
				manageUrl: "https://claude.example.com/usage",
				canConnect: false,
				connected: false,
				account: null,
			},
		]);
		expect(chatgpt.canAuthorize).toHaveBeenCalledWith(redirectUri("chatgpt"));
		expect(claude.canAuthorize).toHaveBeenCalledWith(redirectUri("claude"));
	});

	it("hides disabled providers and shows disconnected registrations as not connected", async () => {
		const repository = createRepository({
			providers: [
				providerRow("chatgpt"),
				providerRow("claude", { enabled: false }),
			],
			connections: [await connectionRow("chatgpt", { accessToken: null })],
		});
		const { service } = setup({
			adapters: [fakeAdapter("chatgpt"), fakeAdapter("claude")],
			repository,
		});

		const providers = await service.listProviders(USER, redirectUri);

		expect(providers.map((provider) => provider.id)).toEqual(["chatgpt"]);
		expect(providers[0]).toMatchObject({ connected: false, account: null });
	});

	it("requires a HackerFeed user", async () => {
		const { service } = setup();

		await expect(service.listProviders(null, redirectUri)).rejects.toThrow(
			"Authentication required",
		);
	});
});

describe("startAuthorization", () => {
	it("delegates to the adapter and captures the flow", async () => {
		const adapter = fakeAdapter("chatgpt");
		const { service } = setup({ adapters: [adapter] });

		const result = await service.startAuthorization(USER, "chatgpt", {
			redirectUri: redirectUri("chatgpt"),
			returnTo: "/chat/1",
		});

		expect(adapter.createAuthorization).toHaveBeenCalledWith({
			registration: null,
			redirectUri: redirectUri("chatgpt"),
			loginHint: null,
		});
		expect(result).toEqual({
			url: "https://chatgpt.example.com/authorize?state=state-1",
			flow: flow({ returnTo: "/chat/1" }),
		});
	});

	it("passes the stored registration and account hint", async () => {
		const adapter = fakeAdapter("chatgpt");
		const repository = createRepository({
			connections: [await connectionRow("chatgpt", { accessToken: null })],
		});
		const { service } = setup({ adapters: [adapter], repository });

		await service.startAuthorization(USER, "chatgpt", {
			redirectUri: redirectUri("chatgpt"),
			returnTo: "/",
		});

		expect(adapter.createAuthorization).toHaveBeenCalledWith({
			registration: { clientId: "chatgpt-client", metadata: { host: "h" } },
			redirectUri: redirectUri("chatgpt"),
			loginHint: "reader@example.com",
		});
	});

	it("ignores malformed registration metadata", async () => {
		const adapter = fakeAdapter("chatgpt");
		const repository = createRepository({
			connections: [
				await connectionRow("chatgpt", {
					registrationMetadata: '{"host":1,"ok":"yes"}',
				}),
			],
		});
		const { service } = setup({ adapters: [adapter], repository });

		await service.startAuthorization(USER, "chatgpt", {
			redirectUri: "r",
			returnTo: "/",
		});
		repository.rows[0].registrationMetadata = "not json";
		await service.startAuthorization(USER, "chatgpt", {
			redirectUri: "r",
			returnTo: "/",
		});

		expect(
			(adapter.createAuthorization as ReturnType<typeof vi.fn>).mock.calls[0][0]
				.registration?.metadata,
		).toEqual({
			ok: "yes",
		});
		expect(
			(adapter.createAuthorization as ReturnType<typeof vi.fn>).mock.calls[1][0]
				.registration?.metadata,
		).toEqual({});
	});

	it.each([
		["a provider without an adapter", "orphan", [providerRow("orphan")]],
		["a provider missing from the catalog", "chatgpt", []],
		[
			"a disabled provider",
			"chatgpt",
			[providerRow("chatgpt", { enabled: false })],
		],
	])("rejects %s", async (_label, providerId, providers) => {
		const { service } = setup({ repository: createRepository({ providers }) });

		await expect(
			service.startAuthorization(USER, providerId, {
				redirectUri: "r",
				returnTo: "/",
			}),
		).rejects.toMatchObject({ code: "provider_not_found" });
	});

	it("surfaces adapter errors", async () => {
		const adapter = fakeAdapter("chatgpt", {
			createAuthorization: vi.fn(async () => {
				throw new AiProviderError("provider_unavailable", "Not configured");
			}),
		});
		const { service } = setup({ adapters: [adapter] });

		await expect(
			service.startAuthorization(USER, "chatgpt", {
				redirectUri: "r",
				returnTo: "/",
			}),
		).rejects.toMatchObject({ code: "provider_unavailable" });
	});
});

describe("completeAuthorization", () => {
	it("stores the connection with sealed tokens", async () => {
		const adapter = fakeAdapter("chatgpt");
		const { cipher, repository, service } = setup({ adapters: [adapter] });
		const callback = new URLSearchParams({ code: "code-1", state: "state-1" });

		await service.completeAuthorization(USER, flow(), callback);

		expect(adapter.completeAuthorization).toHaveBeenCalledWith({
			callback,
			pending: { verifier: "v-1" },
			redirectUri: redirectUri("chatgpt"),
		});
		const row = repository.find("app-user-1", "chatgpt");
		expect(row).toMatchObject({
			clientId: "chatgpt-client",
			registrationMetadata: '{"host":"h"}',
			subject: "sub-1",
			email: "reader@example.com",
			scopes: "chat",
		});
		expect(row?.accessToken).not.toBe("chatgpt-access");
		await expect(cipher.decrypt(row?.accessToken ?? "")).resolves.toBe(
			"chatgpt-access",
		);
		await expect(cipher.decrypt(row?.refreshToken ?? "")).resolves.toBe(
			"chatgpt-refresh",
		);
	});

	it("keeps connections to different providers separate", async () => {
		const { repository, service } = setup({
			adapters: [fakeAdapter("chatgpt"), fakeAdapter("claude")],
			repository: createRepository({
				providers: [providerRow("chatgpt"), providerRow("claude")],
			}),
		});

		await service.completeAuthorization(USER, flow(), new URLSearchParams());
		await service.completeAuthorization(
			USER,
			flow({ providerId: "claude" }),
			new URLSearchParams(),
		);

		expect(repository.rows.map((row) => row.providerId)).toEqual([
			"chatgpt",
			"claude",
		]);
	});

	it("rejects callbacks for a different HackerFeed user", async () => {
		const adapter = fakeAdapter("chatgpt");
		const { service } = setup({ adapters: [adapter] });

		await expect(
			service.completeAuthorization(
				{ workosUserId: "someone-else" },
				flow(),
				new URLSearchParams(),
			),
		).rejects.toMatchObject({ code: "session_mismatch" });
		expect(adapter.completeAuthorization).not.toHaveBeenCalled();
	});

	it("doesn't store anything when the adapter fails", async () => {
		const adapter = fakeAdapter("chatgpt", {
			completeAuthorization: vi.fn(async () => {
				throw new AiProviderError("invalid_id_token", "bad");
			}),
		});
		const { repository, service } = setup({ adapters: [adapter] });

		await expect(
			service.completeAuthorization(USER, flow(), new URLSearchParams()),
		).rejects.toMatchObject({ code: "invalid_id_token" });
		expect(repository.saveConnection).not.toHaveBeenCalled();
	});
});

describe("access tokens", () => {
	it("uses a fresh stored token without refreshing", async () => {
		const adapter = fakeAdapter("chatgpt");
		const repository = createRepository({
			connections: [await connectionRow("chatgpt")],
		});
		const { service } = setup({ adapters: [adapter], repository });

		await service.listModels(USER, "chatgpt");

		expect(adapter.refresh).not.toHaveBeenCalled();
		expect(adapter.listModels).toHaveBeenCalledWith("chatgpt-access-old");
	});

	it("refreshes tokens close to expiry and persists the rotation", async () => {
		const adapter = fakeAdapter("chatgpt");
		const repository = createRepository({
			connections: [
				await connectionRow("chatgpt", {
					accessTokenExpiresAt: Date.now() + 30_000,
				}),
			],
		});
		const { cipher, service } = setup({ adapters: [adapter], repository });

		await service.listModels(USER, "chatgpt");

		expect(adapter.refresh).toHaveBeenCalledWith({
			registration: { clientId: "chatgpt-client", metadata: { host: "h" } },
			refreshToken: "chatgpt-refresh-old",
			scopes: ["chat"],
		});
		expect(adapter.listModels).toHaveBeenCalledWith("chatgpt-access-new");
		const row = repository.find("app-user-1", "chatgpt");
		await expect(cipher.decrypt(row?.refreshToken ?? "")).resolves.toBe(
			"chatgpt-refresh-new",
		);
	});

	it("disconnects when the adapter says a reconnect is required", async () => {
		const adapter = fakeAdapter("chatgpt", {
			refresh: vi.fn(async () => {
				throw new AiProviderError("refresh_token_reused", "Reconnect", {
					requiresReconnect: true,
				});
			}),
		});
		const repository = createRepository({
			connections: [
				await connectionRow("chatgpt", { accessTokenExpiresAt: 0 }),
			],
		});
		const { service } = setup({ adapters: [adapter], repository });

		await expect(service.listModels(USER, "chatgpt")).rejects.toMatchObject({
			code: "refresh_token_reused",
		});
		expect(repository.find("app-user-1", "chatgpt")?.accessToken).toBeNull();
		expect(repository.find("app-user-1", "chatgpt")?.clientId).toBe(
			"chatgpt-client",
		);
	});

	it("keeps the connection on transient refresh failures", async () => {
		const adapter = fakeAdapter("chatgpt", {
			refresh: vi.fn(async () => {
				throw new AiProviderError("network_error", "Offline", {
					retryable: true,
				});
			}),
		});
		const repository = createRepository({
			connections: [
				await connectionRow("chatgpt", { accessTokenExpiresAt: 0 }),
			],
		});
		const { service } = setup({ adapters: [adapter], repository });

		await expect(service.listModels(USER, "chatgpt")).rejects.toMatchObject({
			retryable: true,
		});
		expect(repository.clearTokens).not.toHaveBeenCalled();
	});

	it("disconnects when a refresh returns a different account", async () => {
		const adapter = fakeAdapter("chatgpt", {
			refresh: vi.fn(async () => ({
				tokens: {
					accessToken: "a",
					refreshToken: "r",
					expiresAt: Date.now() + 3_600_000,
					scopes: [],
				},
				identity: { subject: "someone-else", email: null, name: null },
			})),
		});
		const repository = createRepository({
			connections: [
				await connectionRow("chatgpt", { accessTokenExpiresAt: 0 }),
			],
		});
		const { service } = setup({ adapters: [adapter], repository });

		await expect(service.listModels(USER, "chatgpt")).rejects.toMatchObject({
			code: "account_mismatch",
		});
		expect(repository.clearTokens).toHaveBeenCalledWith(
			"app-user-1",
			"chatgpt",
		);
		expect(repository.updateTokens).not.toHaveBeenCalled();
	});

	it("disconnects expired connections without a refresh token", async () => {
		const repository = createRepository({
			connections: [
				await connectionRow("chatgpt", {
					accessTokenExpiresAt: 0,
					refreshToken: null,
				}),
			],
		});
		const { service } = setup({ repository });

		await expect(service.listModels(USER, "chatgpt")).rejects.toMatchObject({
			code: "provider_not_connected",
			message: "Connect ChatGPT from your profile to start chatting.",
		});
		expect(repository.clearTokens).toHaveBeenCalled();
	});

	it.each([
		["no connection", []],
		["a disconnected registration", [{ accessToken: null }]],
		["an undecryptable token", [{ accessToken: "v1.garbage.garbage" }]],
	])("reports not connected with %s", async (_label, overrides) => {
		const connections = await Promise.all(
			overrides.map((override) => connectionRow("chatgpt", override)),
		);
		const { service } = setup({
			repository: createRepository({ connections }),
		});

		await expect(service.listModels(USER, "chatgpt")).rejects.toMatchObject({
			code: "provider_not_connected",
		});
	});
});

describe("startChat", () => {
	it("streams from the chosen provider with its own token", async () => {
		const chatgpt = fakeAdapter("chatgpt");
		const claude = fakeAdapter("claude", {
			streamReply: vi.fn(async function* () {
				yield "From ";
				yield "Claude";
			}),
		});
		const repository = createRepository({
			providers: [providerRow("chatgpt"), providerRow("claude")],
			connections: [
				await connectionRow("chatgpt"),
				await connectionRow("claude"),
			],
		});
		const { service } = setup({ adapters: [chatgpt, claude], repository });
		const input = {
			instructions: "ctx",
			messages: [{ role: "user" as const, content: "hi" }],
			model: "m",
		};

		const stream = await service.startChat(USER, "claude", input);

		await expect(collect(stream)).resolves.toEqual(["From ", "Claude"]);
		expect(claude.streamReply).toHaveBeenCalledWith("claude-access-old", input);
		expect(chatgpt.streamReply).not.toHaveBeenCalled();
	});

	it("fails before streaming when not connected", async () => {
		const adapter = fakeAdapter("chatgpt");
		const { service } = setup({ adapters: [adapter] });

		await expect(
			service.startChat(USER, "chatgpt", {
				instructions: "",
				messages: [{ role: "user", content: "hi" }],
				model: "m",
			}),
		).rejects.toMatchObject({ code: "provider_not_connected" });
		expect(adapter.streamReply).not.toHaveBeenCalled();
	});
});

describe("disconnect", () => {
	it("clears tokens, keeps the registration, and revokes", async () => {
		const adapter = fakeAdapter("chatgpt");
		const repository = createRepository({
			connections: [await connectionRow("chatgpt")],
		});
		const { service } = setup({ adapters: [adapter], repository });

		await service.disconnect(USER, "chatgpt");

		const row = repository.find("app-user-1", "chatgpt");
		expect(row?.accessToken).toBeNull();
		expect(row?.clientId).toBe("chatgpt-client");
		expect(adapter.revoke).toHaveBeenCalledWith({
			registration: { clientId: "chatgpt-client", metadata: { host: "h" } },
			refreshToken: "chatgpt-refresh-old",
		});
	});

	it("still disconnects locally when revocation fails", async () => {
		const adapter = fakeAdapter("chatgpt", {
			revoke: vi.fn(async () => {
				throw new Error("offline");
			}),
		});
		const repository = createRepository({
			connections: [await connectionRow("chatgpt")],
		});
		const { service } = setup({ adapters: [adapter], repository });

		await service.disconnect(USER, "chatgpt");

		expect(repository.find("app-user-1", "chatgpt")?.accessToken).toBeNull();
	});

	it("only disconnects the requested provider", async () => {
		const repository = createRepository({
			providers: [providerRow("chatgpt"), providerRow("claude")],
			connections: [
				await connectionRow("chatgpt"),
				await connectionRow("claude"),
			],
		});
		const { service } = setup({
			adapters: [fakeAdapter("chatgpt"), fakeAdapter("claude")],
			repository,
		});

		await service.disconnect(USER, "claude");

		expect(repository.find("app-user-1", "claude")?.accessToken).toBeNull();
		expect(
			repository.find("app-user-1", "chatgpt")?.accessToken,
		).not.toBeNull();
	});

	it("is a no-op when nothing is connected", async () => {
		const adapter = fakeAdapter("chatgpt");
		const { repository, service } = setup({ adapters: [adapter] });

		await service.disconnect(USER, "chatgpt");

		expect(repository.clearTokens).not.toHaveBeenCalled();
		expect(adapter.revoke).not.toHaveBeenCalled();
	});
});
