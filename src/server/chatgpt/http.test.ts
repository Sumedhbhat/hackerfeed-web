import { describe, expect, it, vi } from "vitest";
import type { ChatStreamEvent } from "#/lib/chatgpt/schemas";
import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";
import { ChatGptError, ChatGptNotConnectedError } from "./errors";
import { createChatGptHttpHandlers, type StoryChatContext } from "./http";
import type { ChatGptAuthorizationFlow, ChatGptService } from "./service";
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

function flow(overrides: Partial<ChatGptAuthorizationFlow> = {}) {
	return {
		clientId: null,
		codeVerifier: "verifier",
		hostId: "urn:uuid:host",
		nonce: "nonce",
		redirectUri: `${ORIGIN}/chatgpt/callback`,
		returnTo: "/chat/42",
		state: "state-1",
		workosUserId: "workos-1",
		...overrides,
	};
}

async function* fromArray(items: string[], error?: Error) {
	for (const item of items) yield item;
	if (error) throw error;
}

function setup({
	user = USER as typeof USER | null,
	setCookie,
	context = { story, comments: [] } as StoryChatContext | null,
}: {
	user?: typeof USER | null;
	setCookie?: string;
	context?: StoryChatContext | null;
} = {}) {
	const cipher = createTokenCipher("test-secret-that-is-long-enough-123");
	const service = {
		getStatus: vi.fn().mockResolvedValue({
			canConnect: true,
			connected: true,
			email: "reader@example.com",
			name: null,
		}),
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
	const handlers = createChatGptHttpHandlers({
		cipher,
		getOrigin: () => ORIGIN,
		getService: () => service as unknown as ChatGptService,
		getSession: vi.fn().mockResolvedValue({ user, setCookie }),
		getStoryContext,
	});
	return { cipher, getStoryContext, handlers, service };
}

async function flowCookie(
	cipher: ReturnType<typeof createTokenCipher>,
	value: ChatGptAuthorizationFlow = flow(),
) {
	return `hackerfeed_chatgpt_flow=${encodeURIComponent(
		await cipher.encrypt(JSON.stringify(value)),
	)}`;
}

function chatRequest(body: unknown, headers: Record<string, string> = {}) {
	return new Request(`${ORIGIN}/api/chatgpt/chat`, {
		method: "POST",
		headers: { "content-type": "application/json", ...headers },
		body: JSON.stringify(body),
	});
}

const validChat = {
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
	it("redirects to ChatGPT and stores the sealed flow in a cookie", async () => {
		const { handlers, service } = setup();

		const response = await handlers.connect(
			new Request(`${ORIGIN}/chatgpt/connect?returnTo=%2Fchat%2F42`),
		);

		expect(response.status).toBe(302);
		expect(response.headers.get("Location")).toContain(
			"https://auth.openai.com/api/accounts/authorize",
		);
		expect(service.startAuthorization).toHaveBeenCalledWith(USER, {
			redirectUri: `${ORIGIN}/chatgpt/callback`,
			returnTo: "/chat/42",
		});
		const cookie = response.headers.get("Set-Cookie") ?? "";
		expect(cookie).toMatch(/^hackerfeed_chatgpt_flow=/);
		expect(cookie).toContain("HttpOnly");
		expect(cookie).toContain("SameSite=Lax");
		expect(cookie).toContain("Max-Age=600");
		// The verifier is sealed, not readable in the cookie.
		expect(decodeURIComponent(cookie)).not.toContain("verifier");
	});

	it("defaults to returning to the profile and rejects open redirects", async () => {
		const { handlers, service } = setup();

		await handlers.connect(new Request(`${ORIGIN}/chatgpt/connect`));
		await handlers.connect(
			new Request(`${ORIGIN}/chatgpt/connect?returnTo=//evil.example.com`),
		);

		expect(service.startAuthorization.mock.calls[0][1].returnTo).toBe(
			"/profile",
		);
		expect(service.startAuthorization.mock.calls[1][1].returnTo).toBe("/");
	});

	it("sends signed-out users through HackerFeed sign-in first", async () => {
		const { handlers, service } = setup({ user: null });

		const response = await handlers.connect(
			new Request(`${ORIGIN}/chatgpt/connect?returnTo=%2Fprofile`),
		);

		const location = new URL(response.headers.get("Location") ?? "", ORIGIN);
		expect(location.pathname).toBe("/auth/sign-in");
		expect(location.searchParams.get("returnTo")).toBe(
			"/chatgpt/connect?returnTo=%2Fprofile",
		);
		expect(service.startAuthorization).not.toHaveBeenCalled();
	});

	it("redirects back with the error code when authorization can't start", async () => {
		const { handlers, service } = setup();
		service.startAuthorization.mockRejectedValue(
			new ChatGptError("chatgpt_unavailable", "nope"),
		);

		const response = await handlers.connect(
			new Request(`${ORIGIN}/chatgpt/connect`),
		);

		expect(response.headers.get("Location")).toBe(
			"/profile?chatgpt=error&reason=chatgpt_unavailable",
		);
		expect(response.headers.get("Set-Cookie")).toBeNull();
	});

	it("forwards refreshed session cookies", async () => {
		const { handlers } = setup({ setCookie: "hackerfeed_session=new" });

		const response = await handlers.connect(
			new Request(`${ORIGIN}/chatgpt/connect`),
		);

		expect(response.headers.get("Set-Cookie")).toContain(
			"hackerfeed_session=new",
		);
	});
});

describe("callback", () => {
	it("completes authorization and returns to the original page", async () => {
		const { cipher, handlers, service } = setup();

		const response = await handlers.callback(
			new Request(
				`${ORIGIN}/chatgpt/callback?code=code-1&state=state-1&client_id=oaiapp_1`,
				{ headers: { Cookie: await flowCookie(cipher) } },
			),
		);

		expect(response.status).toBe(302);
		expect(response.headers.get("Location")).toBe("/chat/42?chatgpt=connected");
		expect(service.completeAuthorization).toHaveBeenCalledWith(USER, flow(), {
			code: "code-1",
			clientId: "oaiapp_1",
		});
		expect(response.headers.get("Set-Cookie")).toContain(
			"hackerfeed_chatgpt_flow=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
		);
	});

	it("passes a null client id when the callback omits it", async () => {
		const { cipher, handlers, service } = setup();

		await handlers.callback(
			new Request(`${ORIGIN}/chatgpt/callback?code=c&state=state-1`, {
				headers: { Cookie: await flowCookie(cipher) },
			}),
		);

		expect(service.completeAuthorization.mock.calls[0][2]).toEqual({
			code: "c",
			clientId: null,
		});
	});

	it.each([
		["missing cookie", "?code=c&state=state-1", false],
		["wrong state", "?code=c&state=forged", true],
		["duplicated state", "?code=c&state=state-1&state=state-1", true],
		["missing state", "?code=c", true],
	])("rejects %s as expired", async (_label, query, withCookie) => {
		const { cipher, handlers, service } = setup();
		const headers: Record<string, string> = withCookie
			? { Cookie: await flowCookie(cipher) }
			: {};

		const response = await handlers.callback(
			new Request(`${ORIGIN}/chatgpt/callback${query}`, { headers }),
		);

		expect(response.headers.get("Location")).toBe(
			"/profile?chatgpt=error&reason=expired",
		);
		expect(service.completeAuthorization).not.toHaveBeenCalled();
	});

	it("rejects a flow cookie sealed with another key", async () => {
		const { handlers, service } = setup();
		const foreign = createTokenCipher("some-other-secret-that-is-long-enough");

		const response = await handlers.callback(
			new Request(`${ORIGIN}/chatgpt/callback?code=c&state=state-1`, {
				headers: { Cookie: await flowCookie(foreign) },
			}),
		);

		expect(response.headers.get("Location")).toContain("reason=expired");
		expect(service.completeAuthorization).not.toHaveBeenCalled();
	});

	it("reports provider errors like a cancelled consent", async () => {
		const { cipher, handlers, service } = setup();

		const response = await handlers.callback(
			new Request(
				`${ORIGIN}/chatgpt/callback?error=access_denied&state=state-1`,
				{ headers: { Cookie: await flowCookie(cipher) } },
			),
		);

		expect(response.headers.get("Location")).toBe(
			"/chat/42?chatgpt=error&reason=access_denied",
		);
		expect(service.completeAuthorization).not.toHaveBeenCalled();
	});

	it("sanitizes unexpected provider error values", async () => {
		const { cipher, handlers } = setup();

		const response = await handlers.callback(
			new Request(
				`${ORIGIN}/chatgpt/callback?error=%3Cscript%3E&state=state-1`,
				{ headers: { Cookie: await flowCookie(cipher) } },
			),
		);

		expect(response.headers.get("Location")).toContain("reason=provider_error");
	});

	it.each([
		["missing code", "?state=state-1"],
		["duplicate codes", "?state=state-1&code=a&code=b"],
		["duplicate client ids", "?state=state-1&code=a&client_id=x&client_id=y"],
	])("rejects %s", async (_label, query) => {
		const { cipher, handlers, service } = setup();

		const response = await handlers.callback(
			new Request(`${ORIGIN}/chatgpt/callback${query}`, {
				headers: { Cookie: await flowCookie(cipher) },
			}),
		);

		expect(response.headers.get("Location")).toContain(
			"reason=invalid_callback",
		);
		expect(service.completeAuthorization).not.toHaveBeenCalled();
	});

	it("requires a signed-in HackerFeed session", async () => {
		const { cipher, handlers, service } = setup({ user: null });

		const response = await handlers.callback(
			new Request(`${ORIGIN}/chatgpt/callback?code=c&state=state-1`, {
				headers: { Cookie: await flowCookie(cipher) },
			}),
		);

		expect(response.headers.get("Location")).toContain("reason=signed_out");
		expect(service.completeAuthorization).not.toHaveBeenCalled();
	});

	it("redirects with the service error code on failure", async () => {
		const { cipher, handlers, service } = setup();
		service.completeAuthorization.mockRejectedValue(
			new ChatGptError("plan_usage_not_granted", "no plan"),
		);

		const response = await handlers.callback(
			new Request(`${ORIGIN}/chatgpt/callback?code=c&state=state-1`, {
				headers: { Cookie: await flowCookie(cipher) },
			}),
		);

		expect(response.headers.get("Location")).toBe(
			"/chat/42?chatgpt=error&reason=plan_usage_not_granted",
		);
	});

	it("uses a generic reason for unexpected failures", async () => {
		const { cipher, handlers, service } = setup();
		service.completeAuthorization.mockRejectedValue(new Error("boom"));

		const response = await handlers.callback(
			new Request(`${ORIGIN}/chatgpt/callback?code=c&state=state-1`, {
				headers: { Cookie: await flowCookie(cipher) },
			}),
		);

		expect(response.headers.get("Location")).toContain(
			"reason=exchange_failed",
		);
	});

	it("preserves existing query strings on the return path", async () => {
		const { cipher, handlers } = setup();

		const response = await handlers.callback(
			new Request(`${ORIGIN}/chatgpt/callback?code=c&state=state-1`, {
				headers: {
					Cookie: await flowCookie(
						cipher,
						flow({ returnTo: "/profile?tab=a" }),
					),
				},
			}),
		);

		expect(response.headers.get("Location")).toBe(
			"/profile?tab=a&chatgpt=connected",
		);
	});
});

describe("status", () => {
	it("returns the connection status", async () => {
		const { handlers, service } = setup();

		const response = await handlers.status(
			new Request(`${ORIGIN}/api/chatgpt/status`),
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		await expect(response.json()).resolves.toMatchObject({ connected: true });
		expect(service.getStatus).toHaveBeenCalledWith(
			USER,
			`${ORIGIN}/chatgpt/callback`,
		);
	});

	it("returns 401 when signed out", async () => {
		const { handlers } = setup({ user: null });

		const response = await handlers.status(
			new Request(`${ORIGIN}/api/chatgpt/status`),
		);

		expect(response.status).toBe(401);
	});
});

describe("models", () => {
	it("returns models", async () => {
		const { handlers } = setup();

		const response = await handlers.models(
			new Request(`${ORIGIN}/api/chatgpt/models`),
		);

		await expect(response.json()).resolves.toEqual({
			models: [{ slug: "m", displayName: "M" }],
		});
	});

	it("returns 409 when ChatGPT isn't connected", async () => {
		const { handlers, service } = setup();
		service.listModels.mockRejectedValue(new ChatGptNotConnectedError());

		const response = await handlers.models(
			new Request(`${ORIGIN}/api/chatgpt/models`),
		);

		expect(response.status).toBe(409);
		await expect(response.json()).resolves.toMatchObject({
			code: "chatgpt_not_connected",
		});
	});

	it("maps rate limits to 429 and other ChatGPT errors to 502", async () => {
		const { handlers, service } = setup();
		service.listModels
			.mockRejectedValueOnce(new ChatGptError("x", "slow", { status: 429 }))
			.mockRejectedValueOnce(new ChatGptError("y", "bad", { status: 500 }));

		const first = await handlers.models(
			new Request(`${ORIGIN}/api/chatgpt/models`),
		);
		const second = await handlers.models(
			new Request(`${ORIGIN}/api/chatgpt/models`),
		);

		expect(first.status).toBe(429);
		expect(second.status).toBe(502);
	});

	it("rethrows unexpected errors", async () => {
		const { handlers, service } = setup();
		service.listModels.mockRejectedValue(new Error("db down"));

		await expect(
			handlers.models(new Request(`${ORIGIN}/api/chatgpt/models`)),
		).rejects.toThrow("db down");
	});
});

describe("disconnect", () => {
	it("disconnects the signed-in user", async () => {
		const { handlers, service } = setup();

		const response = await handlers.disconnect(
			new Request(`${ORIGIN}/api/chatgpt/disconnect`, { method: "POST" }),
		);

		expect(response.status).toBe(200);
		expect(service.disconnect).toHaveBeenCalledWith(USER);
	});

	it("rejects cross-site requests", async () => {
		const { handlers, service } = setup();

		const response = await handlers.disconnect(
			new Request(`${ORIGIN}/api/chatgpt/disconnect`, {
				method: "POST",
				headers: { "Sec-Fetch-Site": "cross-site" },
			}),
		);

		expect(response.status).toBe(403);
		expect(service.disconnect).not.toHaveBeenCalled();
	});

	it("returns 401 when signed out", async () => {
		const { handlers } = setup({ user: null });

		const response = await handlers.disconnect(
			new Request(`${ORIGIN}/api/chatgpt/disconnect`, { method: "POST" }),
		);

		expect(response.status).toBe(401);
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
		const [user, input] = service.startChat.mock.calls[0] ?? [];
		expect(user).toEqual(USER);
		expect(input).toMatchObject({
			model: "gpt-test",
			messages: validChat.messages,
		});
		expect(input.instructions).toContain("Title: A story");
	});

	it("emits an error event when the stream fails midway", async () => {
		const { handlers, service } = setup();
		service.startChat.mockResolvedValue(
			fromArray(
				["partial"],
				new ChatGptError(
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

	it("returns 409 before streaming when ChatGPT isn't connected", async () => {
		const { handlers, service } = setup();
		service.startChat.mockRejectedValue(new ChatGptNotConnectedError());

		const response = await handlers.chat(chatRequest(validChat));

		expect(response.status).toBe(409);
		await expect(response.json()).resolves.toMatchObject({
			code: "chatgpt_not_connected",
		});
	});

	it.each([
		["a missing body", null],
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
			new Request(`${ORIGIN}/api/chatgpt/chat`, {
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

		const response = await handlers.chat(chatRequest(validChat));

		expect(response.status).toBe(401);
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
