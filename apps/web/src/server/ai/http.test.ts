import * as Sentry from "@sentry/core";
import { describe, expect, it, vi } from "vitest";
import type { ChatStreamEvent } from "#/lib/ai/schemas";
import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";
import { installSentryTestClient } from "#/test/sentryTestClient";
import {
	AiProviderError,
	AiProviderNotConnectedError,
	AiProviderNotFoundError,
} from "./errors";
import { createAiHttpHandlers, type StoryChatContext } from "./http";
import type { AiAuthorizationFlow, AiProviderService } from "./service";
import { createTokenCipher } from "./token-crypto";

const ORIGIN = "http://127.0.0.1:3000";
const USER = { workosUserId: "workos-1" };

const story: HackerNewsStoryRecord = {
	by: "pg",
	descendants: 1,
	id: 42,
	kids: [],
	score: 10,
	text: null,
	time: 1,
	title: "A story",
	type: "story",
	url: "https://example.com",
};

function flow(
	overrides: Partial<AiAuthorizationFlow> = {},
): AiAuthorizationFlow {
	return {
		providerId: "chatgpt",
		state: "state-1",
		workosUserId: "workos-1",
		redirectUri: `${ORIGIN}/ai/chatgpt/callback`,
		returnTo: "/chat/42",
		pending: { codeVerifier: "verifier" },
		...overrides,
	};
}

async function* fromArray(items: string[], error?: Error) {
	for (const item of items) yield item;
	if (error) throw error;
}

function setup({
	user = USER as typeof USER | null,
	context = { story, comments: [] } as StoryChatContext | null,
	enabled = true,
}: {
	user?: typeof USER | null;
	context?: StoryChatContext | null;
	enabled?: boolean;
} = {}) {
	const cipher = createTokenCipher("test-secret-that-is-long-enough-123");
	const service = {
		listProviders: vi.fn().mockResolvedValue([
			{
				id: "chatgpt",
				name: "ChatGPT",
				description: "d",
				manageUrl: null,
				canConnect: true,
				connected: true,
				account: { email: "reader@example.com", name: null },
			},
		]),
		startAuthorization: vi.fn().mockResolvedValue({
			flow: flow(),
			url: "https://auth.openai.com/api/accounts/authorize?state=state-1",
		}),
		completeAuthorization: vi.fn().mockResolvedValue(undefined),
		disconnect: vi.fn().mockResolvedValue(undefined),
		listModels: vi.fn().mockResolvedValue([{ slug: "m", displayName: "M" }]),
		startChat: vi.fn().mockResolvedValue(fromArray(["Hello", " world"])),
	};
	const getStoryContext = vi.fn().mockResolvedValue(context);
	const handlers = createAiHttpHandlers({
		cipher,
		getOrigin: () => ORIGIN,
		getService: () => service as unknown as AiProviderService,
		getUser: vi.fn().mockResolvedValue(user),
		isEnabled: vi.fn().mockReturnValue(enabled),
		getStoryContext,
	});
	return { cipher, getStoryContext, handlers, service };
}

async function flowCookie(
	cipher: ReturnType<typeof createTokenCipher>,
	value: AiAuthorizationFlow = flow(),
) {
	return `hackerfeed_ai_flow=${encodeURIComponent(
		await cipher.encrypt(JSON.stringify(value)),
	)}`;
}

async function callbackRequest(
	cipher: ReturnType<typeof createTokenCipher> | null,
	query: string,
	{
		provider = "chatgpt",
		value,
	}: { provider?: string; value?: AiAuthorizationFlow } = {},
) {
	return new Request(`${ORIGIN}/ai/${provider}/callback${query}`, {
		headers: cipher ? { Cookie: await flowCookie(cipher, value) } : {},
	});
}

async function connectUrl(response: Response) {
	return ((await response.json()) as { url: string }).url;
}

function connectRequest(url: string) {
	return new Request(url, { method: "POST" });
}

function chatRequest(body: unknown, headers: Record<string, string> = {}) {
	return new Request(`${ORIGIN}/api/ai/chat`, {
		method: "POST",
		headers: { "content-type": "application/json", ...headers },
		body: JSON.stringify(body),
	});
}

const validChat = {
	providerId: "chatgpt",
	storyId: 42,
	model: "gpt-test",
	messages: [{ role: "user", content: "What is this?" }],
};

async function readEvents(response: Response): Promise<ChatStreamEvent[]> {
	const text = await response.text();
	return text
		.split("\n")
		.filter(Boolean)
		.map((line) => JSON.parse(line) as ChatStreamEvent);
}

describe("connect", () => {
	it("returns the provider URL and seals the flow in a cookie", async () => {
		const { handlers, service } = setup();

		const response = await handlers.connect(
			connectRequest(`${ORIGIN}/ai/chatgpt/connect?returnTo=%2Fchat%2F42`),
			"chatgpt",
		);

		expect(response.status).toBe(200);
		expect(await connectUrl(response)).toContain(
			"https://auth.openai.com/api/accounts/authorize",
		);
		expect(service.startAuthorization).toHaveBeenCalledWith(USER, "chatgpt", {
			redirectUri: `${ORIGIN}/ai/chatgpt/callback`,
			returnTo: "/chat/42",
		});
		const cookie = response.headers.get("Set-Cookie") ?? "";
		expect(cookie).toMatch(/^hackerfeed_ai_flow=/);
		expect(cookie).toContain("HttpOnly");
		expect(cookie).toContain("SameSite=Lax");
		expect(cookie).toContain("Max-Age=600");
		expect(decodeURIComponent(cookie)).not.toContain("verifier");
	});

	it("uses a per-provider callback URL", async () => {
		const { handlers, service } = setup();

		await handlers.connect(
			connectRequest(`${ORIGIN}/ai/claude/connect`),
			"claude",
		);

		expect(service.startAuthorization).toHaveBeenCalledWith(USER, "claude", {
			redirectUri: `${ORIGIN}/ai/claude/callback`,
			returnTo: "/profile",
		});
	});

	it("rejects open redirects", async () => {
		const { handlers, service } = setup();

		await handlers.connect(
			connectRequest(
				`${ORIGIN}/ai/chatgpt/connect?returnTo=//evil.example.com`,
			),
			"chatgpt",
		);

		expect(service.startAuthorization.mock.calls[0][2].returnTo).toBe("/");
	});

	it("returns 404 for malformed provider ids", async () => {
		const { handlers, service } = setup();

		const response = await handlers.connect(
			connectRequest(`${ORIGIN}/ai/Bad%20Id/connect`),
			"Bad Id",
		);

		expect(response.status).toBe(404);
		expect(service.startAuthorization).not.toHaveBeenCalled();
	});

	it("returns 401 for signed-out users", async () => {
		const { handlers, service } = setup({ user: null });

		const response = await handlers.connect(
			connectRequest(`${ORIGIN}/ai/chatgpt/connect?returnTo=%2Fprofile`),
			"chatgpt",
		);

		expect(response.status).toBe(401);
		expect(service.startAuthorization).not.toHaveBeenCalled();
	});

	it("rejects cross-site requests", async () => {
		const { handlers, service } = setup();

		const response = await handlers.connect(
			new Request(`${ORIGIN}/ai/chatgpt/connect`, {
				method: "POST",
				headers: { "Sec-Fetch-Site": "cross-site" },
			}),
			"chatgpt",
		);

		expect(response.status).toBe(403);
		expect(service.startAuthorization).not.toHaveBeenCalled();
	});

	it("returns to the page with the error code when sign-in can't start", async () => {
		const { handlers, service } = setup();
		service.startAuthorization.mockRejectedValue(
			new AiProviderError("provider_unavailable", "nope"),
		);

		const response = await handlers.connect(
			connectRequest(`${ORIGIN}/ai/chatgpt/connect`),
			"chatgpt",
		);

		expect(await connectUrl(response)).toBe(
			"/profile?ai=error&provider=chatgpt&reason=provider_unavailable",
		);
		expect(response.headers.get("Set-Cookie")).toBeNull();
	});

	it("uses a generic reason for unexpected failures", async () => {
		const { handlers, service } = setup();
		service.startAuthorization.mockRejectedValue(new Error("db down"));

		const response = await handlers.connect(
			connectRequest(`${ORIGIN}/ai/chatgpt/connect`),
			"chatgpt",
		);

		expect(await connectUrl(response)).toContain("reason=start_failed");
	});
});

describe("callback", () => {
	it("completes sign-in and returns to the original page", async () => {
		const { cipher, handlers, service } = setup();

		const response = await handlers.callback(
			await callbackRequest(cipher, "?code=code-1&state=state-1&client_id=x"),
			"chatgpt",
		);

		expect(response.status).toBe(302);
		expect(response.headers.get("Location")).toBe(
			"/chat/42?ai=connected&provider=chatgpt",
		);
		const [user, completedFlow, params] =
			service.completeAuthorization.mock.calls[0];
		expect(user).toEqual(USER);
		expect(completedFlow).toEqual(flow());
		expect((params as URLSearchParams).get("client_id")).toBe("x");
		expect(response.headers.get("Set-Cookie")).toContain(
			"hackerfeed_ai_flow=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
		);
	});

	it.each([
		["missing cookie", "?code=c&state=state-1", false],
		["wrong state", "?code=c&state=forged", true],
		["duplicated state", "?code=c&state=state-1&state=state-1", true],
		["missing state", "?code=c", true],
	])("rejects %s as expired", async (_label, query, withCookie) => {
		const { cipher, handlers, service } = setup();

		const response = await handlers.callback(
			await callbackRequest(withCookie ? cipher : null, query),
			"chatgpt",
		);

		expect(response.headers.get("Location")).toBe(
			"/profile?ai=error&provider=chatgpt&reason=expired",
		);
		expect(service.completeAuthorization).not.toHaveBeenCalled();
	});

	it("rejects a flow started for another provider", async () => {
		const { cipher, handlers, service } = setup();

		const response = await handlers.callback(
			await callbackRequest(cipher, "?code=c&state=state-1", {
				provider: "claude",
			}),
			"claude",
		);

		expect(response.headers.get("Location")).toContain("reason=expired");
		expect(service.completeAuthorization).not.toHaveBeenCalled();
	});

	it("rejects a flow cookie sealed with another key", async () => {
		const { handlers, service } = setup();
		const foreign = createTokenCipher("some-other-secret-that-is-long-enough");

		const response = await handlers.callback(
			await callbackRequest(foreign, "?code=c&state=state-1"),
			"chatgpt",
		);

		expect(response.headers.get("Location")).toContain("reason=expired");
		expect(service.completeAuthorization).not.toHaveBeenCalled();
	});

	it("reports provider errors like a cancelled consent", async () => {
		const { cipher, handlers, service } = setup();

		const response = await handlers.callback(
			await callbackRequest(cipher, "?error=access_denied&state=state-1"),
			"chatgpt",
		);

		expect(response.headers.get("Location")).toBe(
			"/chat/42?ai=error&provider=chatgpt&reason=access_denied",
		);
		expect(service.completeAuthorization).not.toHaveBeenCalled();
	});

	it("sanitizes unexpected provider error values", async () => {
		const { cipher, handlers } = setup();

		const response = await handlers.callback(
			await callbackRequest(cipher, "?error=%3Cscript%3E&state=state-1"),
			"chatgpt",
		);

		expect(response.headers.get("Location")).toContain("reason=provider_error");
	});

	it.each([
		["missing code", "?state=state-1"],
		["duplicate codes", "?state=state-1&code=a&code=b"],
	])("rejects %s", async (_label, query) => {
		const { cipher, handlers, service } = setup();

		const response = await handlers.callback(
			await callbackRequest(cipher, query),
			"chatgpt",
		);

		expect(response.headers.get("Location")).toContain(
			"reason=invalid_callback",
		);
		expect(service.completeAuthorization).not.toHaveBeenCalled();
	});

	it("completes for the user who started the flow", async () => {
		const { cipher, handlers, service } = setup({ user: null });

		const response = await handlers.callback(
			await callbackRequest(cipher, "?code=c&state=state-1", {
				value: flow({ workosUserId: "workos-2" }),
			}),
			"chatgpt",
		);

		expect(response.headers.get("Location")).toContain("ai=connected");
		expect(service.completeAuthorization.mock.calls[0][0]).toEqual({
			workosUserId: "workos-2",
		});
	});

	it("redirects with the service error code on failure", async () => {
		const { cipher, handlers, service } = setup();
		service.completeAuthorization.mockRejectedValue(
			new AiProviderError("plan_usage_not_granted", "no plan"),
		);

		const response = await handlers.callback(
			await callbackRequest(cipher, "?code=c&state=state-1"),
			"chatgpt",
		);

		expect(response.headers.get("Location")).toBe(
			"/chat/42?ai=error&provider=chatgpt&reason=plan_usage_not_granted",
		);
	});

	it("uses a generic reason for unexpected failures", async () => {
		const { cipher, handlers, service } = setup();
		service.completeAuthorization.mockRejectedValue(new Error("boom"));

		const response = await handlers.callback(
			await callbackRequest(cipher, "?code=c&state=state-1"),
			"chatgpt",
		);

		expect(response.headers.get("Location")).toContain(
			"reason=exchange_failed",
		);
	});

	it("preserves existing query strings on the return path", async () => {
		const { cipher, handlers } = setup();

		const response = await handlers.callback(
			await callbackRequest(cipher, "?code=c&state=state-1", {
				value: flow({ returnTo: "/profile?tab=a" }),
			}),
			"chatgpt",
		);

		expect(response.headers.get("Location")).toBe(
			"/profile?tab=a&ai=connected&provider=chatgpt",
		);
	});
});

describe("providers", () => {
	it("returns the catalog with per-provider callback URLs", async () => {
		const { handlers, service } = setup();

		const response = await handlers.providers(
			new Request(`${ORIGIN}/api/ai/providers`),
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		await expect(response.json()).resolves.toEqual({
			providers: [expect.objectContaining({ id: "chatgpt", connected: true })],
		});
		const getRedirectUri = service.listProviders.mock.calls[0][1] as (
			id: string,
		) => string;
		expect(getRedirectUri("claude")).toBe(`${ORIGIN}/ai/claude/callback`);
	});

	it("returns 401 when signed out", async () => {
		const { handlers } = setup({ user: null });

		const response = await handlers.providers(
			new Request(`${ORIGIN}/api/ai/providers`),
		);

		expect(response.status).toBe(401);
	});
});

describe("models", () => {
	const request = () =>
		new Request(`${ORIGIN}/api/ai/providers/chatgpt/models`);

	it("returns the provider's models", async () => {
		const { handlers, service } = setup();

		const response = await handlers.models(request(), "chatgpt");

		await expect(response.json()).resolves.toEqual({
			models: [{ slug: "m", displayName: "M" }],
		});
		expect(service.listModels).toHaveBeenCalledWith(USER, "chatgpt");
	});

	it.each([
		["unknown provider", new AiProviderNotFoundError(), 404],
		["not connected", new AiProviderNotConnectedError("ChatGPT"), 409],
		["rate limited", new AiProviderError("x", "slow", { status: 429 }), 429],
		["provider failure", new AiProviderError("y", "bad", { status: 500 }), 502],
	])("maps %s to %i", async (_label, error, status) => {
		const { handlers, service } = setup();
		service.listModels.mockRejectedValue(error);

		const response = await handlers.models(request(), "chatgpt");

		expect(response.status).toBe(status);
		await expect(response.json()).resolves.toMatchObject({ code: error.code });
	});

	it("rethrows unexpected errors", async () => {
		const { handlers, service } = setup();
		service.listModels.mockRejectedValue(new Error("db down"));

		await expect(handlers.models(request(), "chatgpt")).rejects.toThrow(
			"db down",
		);
	});

	it("validates the provider id and session", async () => {
		const { handlers } = setup();
		const signedOut = setup({ user: null });

		expect((await handlers.models(request(), "../etc")).status).toBe(404);
		expect((await signedOut.handlers.models(request(), "chatgpt")).status).toBe(
			401,
		);
	});
});

describe("disconnect", () => {
	const request = (headers: Record<string, string> = {}) =>
		new Request(`${ORIGIN}/api/ai/providers/chatgpt/disconnect`, {
			method: "POST",
			headers,
		});

	it("disconnects the signed-in user's provider", async () => {
		const { handlers, service } = setup();

		const response = await handlers.disconnect(request(), "chatgpt");

		expect(response.status).toBe(200);
		expect(service.disconnect).toHaveBeenCalledWith(USER, "chatgpt");
	});

	it("rejects cross-site requests", async () => {
		const { handlers, service } = setup();

		const response = await handlers.disconnect(
			request({ "Sec-Fetch-Site": "cross-site" }),
			"chatgpt",
		);

		expect(response.status).toBe(403);
		expect(service.disconnect).not.toHaveBeenCalled();
	});

	it("returns 404 for unknown providers and 401 when signed out", async () => {
		const { handlers, service } = setup();
		service.disconnect.mockRejectedValue(new AiProviderNotFoundError());
		const signedOut = setup({ user: null });

		expect((await handlers.disconnect(request(), "nope")).status).toBe(404);
		expect(
			(await signedOut.handlers.disconnect(request(), "chatgpt")).status,
		).toBe(401);
	});
});

describe("chat", () => {
	it("streams deltas as NDJSON and finishes with done", async () => {
		const { getStoryContext, handlers, service } = setup();

		const response = await handlers.chat(
			chatRequest(validChat, { "Sec-Fetch-Site": "same-origin" }),
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toContain(
			"application/x-ndjson",
		);
		await expect(readEvents(response)).resolves.toEqual([
			{ type: "delta", text: "Hello" },
			{ type: "delta", text: " world" },
			{ type: "done" },
		]);
		expect(getStoryContext).toHaveBeenCalledWith(42, expect.any(AbortSignal));
		const [user, providerId, input] = service.startChat.mock.calls[0];
		expect(user).toEqual(USER);
		expect(providerId).toBe("chatgpt");
		expect(input).toMatchObject({
			model: "gpt-test",
			messages: validChat.messages,
		});
		expect(input.instructions).toContain("Title: A story");
	});

	it("routes chats to the requested provider", async () => {
		const { handlers, service } = setup();

		await readEvents(
			await handlers.chat(chatRequest({ ...validChat, providerId: "claude" })),
		);

		expect(service.startChat.mock.calls[0][1]).toBe("claude");
	});

	it("emits an error event when the stream fails midway", async () => {
		const { handlers, service } = setup();
		service.startChat.mockResolvedValue(
			fromArray(
				["partial"],
				new AiProviderError(
					"subscription_sharing_usage_limit_exceeded",
					"Limit hit",
				),
			),
		);

		const response = await handlers.chat(chatRequest(validChat));

		await expect(readEvents(response)).resolves.toEqual([
			{ type: "delta", text: "partial" },
			{
				type: "error",
				code: "subscription_sharing_usage_limit_exceeded",
				message: "Limit hit",
				retryable: false,
			},
		]);
	});

	it("marks the request and stream spans failed when the stream fails midway", async () => {
		const sentry = installSentryTestClient();
		const { handlers, service } = setup();
		service.startChat.mockResolvedValue(
			fromArray(["partial"], new AiProviderError("upstream_failed", "Down")),
		);

		// Like Sentry's Cloudflare wrapper, keep the request span open until the
		// NDJSON body has been read.
		await Sentry.startSpanManual(
			{ name: "POST /api/ai/chat" },
			async (span) => {
				await readEvents(await handlers.chat(chatRequest(validChat)));
				span.end();
			},
		);

		const spans = sentry.endedSpans();
		expect(spans.find((span) => span.name === "AI chat stream")).toMatchObject({
			status: "error",
			attributes: expect.objectContaining({
				"ai.error_code": "upstream_failed",
			}),
		});
		expect(
			spans.find((span) => span.name === "POST /api/ai/chat"),
		).toMatchObject({ status: "error" });
	});

	it("leaves the spans ok when the stream completes", async () => {
		const sentry = installSentryTestClient();
		const { handlers } = setup();

		await Sentry.startSpanManual(
			{ name: "POST /api/ai/chat" },
			async (span) => {
				await readEvents(await handlers.chat(chatRequest(validChat)));
				span.end();
			},
		);

		expect(sentry.endedSpans().map((span) => span.status)).toEqual([
			"ok",
			"ok",
		]);
	});

	it("hides unexpected stream errors behind a generic message", async () => {
		const { handlers, service } = setup();
		service.startChat.mockResolvedValue(
			fromArray([], new Error("secret detail")),
		);

		const events = await readEvents(
			await handlers.chat(chatRequest(validChat)),
		);

		expect(events).toEqual([
			expect.objectContaining({ type: "error", code: "stream_interrupted" }),
		]);
		expect(JSON.stringify(events)).not.toContain("secret detail");
	});

	it.each([
		["not connected", new AiProviderNotConnectedError("ChatGPT"), 409],
		["unknown provider", new AiProviderNotFoundError(), 404],
	])(
		"returns an error before streaming when %s",
		async (_label, error, status) => {
			const { handlers, service } = setup();
			service.startChat.mockRejectedValue(error);

			const response = await handlers.chat(chatRequest(validChat));

			expect(response.status).toBe(status);
			await expect(response.json()).resolves.toMatchObject({
				code: error.code,
			});
		},
	);

	it.each([
		["a missing body", null],
		["a missing provider", { ...validChat, providerId: undefined }],
		["a malformed provider", { ...validChat, providerId: "Chat GPT" }],
		["no messages", { ...validChat, messages: [] }],
		[
			"an assistant last message",
			{ ...validChat, messages: [{ role: "assistant", content: "hi" }] },
		],
		[
			"a system message",
			{ ...validChat, messages: [{ role: "system", content: "hi" }] },
		],
		[
			"an empty message",
			{ ...validChat, messages: [{ role: "user", content: "   " }] },
		],
		[
			"too many messages",
			{
				...validChat,
				messages: Array.from({ length: 41 }, () => ({
					role: "user",
					content: "x",
				})),
			},
		],
		[
			"an oversized message",
			{
				...validChat,
				messages: [{ role: "user", content: "x".repeat(8_001) }],
			},
		],
		["an invalid story id", { ...validChat, storyId: -1 }],
		["a missing model", { ...validChat, model: "" }],
	])("rejects %s with 400", async (_label, body) => {
		const { handlers, service } = setup();

		const response = await handlers.chat(chatRequest(body));

		expect(response.status).toBe(400);
		expect(service.startChat).not.toHaveBeenCalled();
	});

	it("requires a JSON content type", async () => {
		const { handlers } = setup();

		const response = await handlers.chat(
			new Request(`${ORIGIN}/api/ai/chat`, {
				method: "POST",
				headers: { "content-type": "text/plain" },
				body: JSON.stringify(validChat),
			}),
		);

		expect(response.status).toBe(415);
	});

	it("rejects cross-site requests", async () => {
		const { handlers, service } = setup();

		const response = await handlers.chat(
			chatRequest(validChat, { "Sec-Fetch-Site": "cross-site" }),
		);

		expect(response.status).toBe(403);
		expect(service.startChat).not.toHaveBeenCalled();
	});

	it("returns 401 when signed out", async () => {
		const { handlers } = setup({ user: null });

		expect((await handlers.chat(chatRequest(validChat))).status).toBe(401);
	});

	it("returns 404 for missing stories or context failures", async () => {
		const missing = setup({ context: null });
		const failing = setup();
		failing.getStoryContext.mockRejectedValue(new Error("HN down"));

		expect((await missing.handlers.chat(chatRequest(validChat))).status).toBe(
			404,
		);
		expect((await failing.handlers.chat(chatRequest(validChat))).status).toBe(
			404,
		);
		expect(missing.service.startChat).not.toHaveBeenCalled();
	});
});

describe("with the aiChat flag off", () => {
	it("hides every endpoint from the user", async () => {
		const { handlers, service } = setup({ enabled: false });
		const responses = await Promise.all([
			handlers.connect(
				connectRequest(`${ORIGIN}/ai/chatgpt/connect?returnTo=%2Fprofile`),
				"chatgpt",
			),
			handlers.providers(new Request(`${ORIGIN}/api/ai/providers`)),
			handlers.models(
				new Request(`${ORIGIN}/api/ai/providers/chatgpt/models`),
				"chatgpt",
			),
			handlers.disconnect(
				new Request(`${ORIGIN}/api/ai/providers/chatgpt/disconnect`, {
					method: "POST",
				}),
				"chatgpt",
			),
			handlers.chat(chatRequest(validChat)),
		]);

		for (const response of responses) {
			expect(response.status).toBe(404);
			expect(await response.json()).toMatchObject({
				code: "feature_disabled",
			});
		}
		expect(service.startAuthorization).not.toHaveBeenCalled();
		expect(service.listProviders).not.toHaveBeenCalled();
		expect(service.listModels).not.toHaveBeenCalled();
		expect(service.disconnect).not.toHaveBeenCalled();
		expect(service.startChat).not.toHaveBeenCalled();
	});

	it("refuses to finish a sign-in that started before the flag went off", async () => {
		const { cipher, handlers, service } = setup({ enabled: false });

		const response = await handlers.callback(
			await callbackRequest(cipher, "?code=code-1&state=state-1"),
			"chatgpt",
		);

		expect(response.headers.get("Location")).toBe(
			"/chat/42?ai=error&provider=chatgpt&reason=feature_disabled",
		);
		expect(service.completeAuthorization).not.toHaveBeenCalled();
	});
});
