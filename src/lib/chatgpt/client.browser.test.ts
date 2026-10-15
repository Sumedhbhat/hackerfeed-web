import { afterEach, describe, expect, it, vi } from "vitest";
import {
	ChatGptRequestError,
	disconnectChatGpt,
	fetchChatGptModels,
	fetchChatGptStatus,
	getChatGptConnectUrl,
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
	storyId: 1,
	model: "m",
	messages: [{ role: "user" as const, content: "hi" }],
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("chatgpt client", () => {
	it("builds the connect URL with an encoded return path", () => {
		expect(getChatGptConnectUrl("/chat/1?x=y")).toBe(
			"/chatgpt/connect?returnTo=%2Fchat%2F1%3Fx%3Dy",
		);
	});

	it("fetches status and models", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValueOnce(
				Response.json({
					canConnect: true,
					connected: false,
					email: null,
					name: null,
				}),
			)
			.mockResolvedValueOnce(
				Response.json({ models: [{ slug: "a", displayName: "A" }] }),
			);
		vi.stubGlobal("fetch", fetch);

		await expect(fetchChatGptStatus()).resolves.toMatchObject({
			connected: false,
		});
		await expect(fetchChatGptModels()).resolves.toEqual([
			{ slug: "a", displayName: "A" },
		]);
		expect(fetch.mock.calls.map(([url]) => url)).toEqual([
			"/api/chatgpt/status",
			"/api/chatgpt/models",
		]);
	});

	it("surfaces API error bodies as ChatGptRequestError", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				Response.json(
					{
						code: "chatgpt_not_connected",
						message: "Connect first",
						retryable: false,
					},
					{ status: 409 },
				),
			),
		);

		const error = await fetchChatGptModels().catch((caught) => caught);

		expect(error).toBeInstanceOf(ChatGptRequestError);
		expect(error).toMatchObject({
			code: "chatgpt_not_connected",
			message: "Connect first",
			status: 409,
		});
	});

	it("falls back to a generic error for non-JSON failures", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response("<html>", { status: 500 })),
		);

		await expect(fetchChatGptStatus()).rejects.toMatchObject({
			code: "request_failed",
			retryable: true,
			status: 500,
		});
	});

	it("posts disconnects", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(Response.json({ connected: false }));
		vi.stubGlobal("fetch", fetch);

		await disconnectChatGpt();

		expect(fetch).toHaveBeenCalledWith(
			"/api/chatgpt/disconnect",
			expect.objectContaining({ method: "POST" }),
		);
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
		expect(url).toBe("/api/chatgpt/chat");
		expect(init.method).toBe("POST");
		expect(JSON.parse(init.body as string)).toEqual(request);
		expect(new Headers(init.headers).get("content-type")).toBe(
			"application/json",
		);
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
						'{"type":"error","code":"subscription_sharing_usage_limit_exceeded","message":"Limit","retryable":false}\n',
					]),
				),
		);
		const deltas: string[] = [];

		await expect(
			streamStoryChat(request, { onDelta: (text) => deltas.push(text) }),
		).rejects.toMatchObject({
			code: "subscription_sharing_usage_limit_exceeded",
			message: "Limit",
		});
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
