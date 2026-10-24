import { afterEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => ({
	getApiHeaders: vi.fn(async () => ({ Authorization: "Bearer token-1" })),
	signIn: vi.fn(),
}));

vi.mock("#/lib/auth/authkit", () => authMock);

import {
	AiRequestError,
	connectAiProvider,
	disconnectAiProvider,
	fetchAiModels,
	fetchAiProviders,
	getAiConnectUrl,
	streamStoryChat,
} from "./client";

function ndjsonResponse(chunks: string[], status = 200) {
	const encoder = new TextEncoder();
	return new Response(
		new ReadableStream({
			start(controller) {
				for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
				controller.close();
			},
		}),
		{ status, headers: { "content-type": "application/x-ndjson" } },
	);
}

const request = {
	providerId: "chatgpt",
	storyId: 1,
	model: "m",
	messages: [{ role: "user" as const, content: "hi" }],
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("AI client", () => {
	it("builds per-provider connect URLs with an encoded return path", () => {
		expect(getAiConnectUrl("chatgpt", "/chat/1?x=y")).toBe(
			"/ai/chatgpt/connect?returnTo=%2Fchat%2F1%3Fx%3Dy",
		);
	});

	it("fetches the provider catalog and a provider's models", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValueOnce(Response.json({ providers: [{ id: "chatgpt" }] }))
			.mockResolvedValueOnce(
				Response.json({ models: [{ slug: "a", displayName: "A" }] }),
			);
		vi.stubGlobal("fetch", fetch);

		await expect(fetchAiProviders()).resolves.toEqual([{ id: "chatgpt" }]);
		await expect(fetchAiModels("chatgpt")).resolves.toEqual([
			{ slug: "a", displayName: "A" },
		]);
		expect(fetch.mock.calls.map(([url]) => url)).toEqual([
			"/api/ai/providers",
			"/api/ai/providers/chatgpt/models",
		]);
	});

	it("surfaces API error bodies as AiRequestError", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				Response.json(
					{
						code: "provider_not_connected",
						message: "Connect first",
						retryable: false,
					},
					{ status: 409 },
				),
			),
		);

		const error = await fetchAiModels("chatgpt").catch((caught) => caught);

		expect(error).toBeInstanceOf(AiRequestError);
		expect(error).toMatchObject({
			code: "provider_not_connected",
			message: "Connect first",
			status: 409,
		});
	});

	it("falls back to a generic error for non-JSON failures", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response("<html>", { status: 500 })),
		);

		await expect(fetchAiProviders()).rejects.toMatchObject({
			code: "request_failed",
			retryable: true,
			status: 500,
		});
	});

	it("posts disconnects to the provider", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(Response.json({ connected: false }));
		vi.stubGlobal("fetch", fetch);

		await disconnectAiProvider("chatgpt");

		expect(fetch).toHaveBeenCalledWith(
			"/api/ai/providers/chatgpt/disconnect",
			expect.objectContaining({
				method: "POST",
				headers: { Authorization: "Bearer token-1" },
			}),
		);
	});

	it("starts a connection with the bearer token and follows the provider URL", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(Response.json({ url: "https://provider.test/auth" }));
		const assign = vi.fn();
		vi.stubGlobal("fetch", fetch);
		vi.stubGlobal("location", { ...window.location, assign });

		await connectAiProvider("chatgpt", "/profile");

		expect(fetch).toHaveBeenCalledWith(
			"/ai/chatgpt/connect?returnTo=%2Fprofile",
			{ method: "POST", headers: { Authorization: "Bearer token-1" } },
		);
		expect(assign).toHaveBeenCalledWith("https://provider.test/auth");
	});

	it("asks signed-out users to sign in before connecting", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
		);

		await connectAiProvider("chatgpt", "/profile");

		expect(authMock.signIn).toHaveBeenCalledWith("/profile");
	});
});

describe("streamStoryChat", () => {
	it("posts the request and delivers deltas across chunk boundaries", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(
				ndjsonResponse([
					'{"type":"delta","text":"Hel',
					'lo"}\n{"type":"delta","text":" there"}\n',
					'{"type":"done"}\n',
				]),
			);
		vi.stubGlobal("fetch", fetch);
		const deltas: string[] = [];

		await streamStoryChat(request, { onDelta: (text) => deltas.push(text) });

		expect(deltas).toEqual(["Hello", " there"]);
		const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
		expect(url).toBe("/api/ai/chat");
		expect(init.method).toBe("POST");
		expect(JSON.parse(init.body as string)).toEqual(request);
	});

	it("handles a final done event without a trailing newline", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValue(
					ndjsonResponse(['{"type":"delta","text":"a"}\n{"type":"done"}']),
				),
		);

		await expect(
			streamStoryChat(request, { onDelta: () => undefined }),
		).resolves.toBeUndefined();
	});

	it("rejects with stream errors after delivering partial text", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValue(
					ndjsonResponse([
						'{"type":"delta","text":"part"}\n',
						'{"type":"error","code":"limit","message":"Limit","retryable":false}\n',
					]),
				),
		);
		const deltas: string[] = [];

		await expect(
			streamStoryChat(request, { onDelta: (text) => deltas.push(text) }),
		).rejects.toMatchObject({ code: "limit", message: "Limit" });
		expect(deltas).toEqual(["part"]);
	});

	it("rejects when the stream ends without done", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValue(ndjsonResponse(['{"type":"delta","text":"a"}\n'])),
		);

		await expect(
			streamStoryChat(request, { onDelta: () => undefined }),
		).rejects.toMatchObject({ code: "stream_interrupted", retryable: true });
	});

	it("rejects with the JSON error for non-2xx responses", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValue(
					Response.json(
						{ code: "story_not_found", message: "Gone" },
						{ status: 404 },
					),
				),
		);

		await expect(
			streamStoryChat(request, { onDelta: () => undefined }),
		).rejects.toMatchObject({ code: "story_not_found", status: 404 });
	});
});
