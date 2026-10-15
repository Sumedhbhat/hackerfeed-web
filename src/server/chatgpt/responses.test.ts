import { describe, expect, it, vi } from "vitest";
import { listModels, parseServerSentEvents, streamResponse } from "./responses";

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder();
	return new ReadableStream({
		start(controller) {
			for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
			controller.close();
		},
	});
}

function sse(...events: unknown[]): string {
	return events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
}

function sseResponse(chunks: string[], status = 200) {
	return new Response(streamOf(chunks), {
		status,
		headers: { "content-type": "text/event-stream" },
	});
}

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
	const items: T[] = [];
	for await (const item of iterable) items.push(item);
	return items;
}

const delta = (text: string) => ({
	type: "response.output_text.delta",
	delta: text,
});
const completed = { type: "response.completed", response: {} };

describe("parseServerSentEvents", () => {
	it("parses events split across arbitrary chunk boundaries", async () => {
		const raw = sse({ a: 1 }, { b: 2 });
		const chunks = raw.match(/.{1,5}/gs) ?? [];

		await expect(
			collect(parseServerSentEvents(streamOf(chunks))),
		).resolves.toEqual([{ a: 1 }, { b: 2 }]);
	});

	it("handles CRLF delimiters, event names, comments, and [DONE]", async () => {
		const raw =
			': keep-alive\r\n\r\nevent: x\r\ndata: {"a":1}\r\n\r\ndata: [DONE]\r\n\r\n';

		await expect(
			collect(parseServerSentEvents(streamOf([raw]))),
		).resolves.toEqual([{ a: 1 }]);
	});

	it("parses a trailing event without a final blank line", async () => {
		await expect(
			collect(parseServerSentEvents(streamOf(['data: {"last":true}']))),
		).resolves.toEqual([{ last: true }]);
	});

	it("decodes multi-byte characters split across chunks", async () => {
		const bytes = new TextEncoder().encode(sse({ text: "héllo ✓" }));
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
				controller.close();
			},
		});

		await expect(collect(parseServerSentEvents(stream))).resolves.toEqual([
			{ text: "héllo ✓" },
		]);
	});

	it("throws on invalid JSON", async () => {
		await expect(
			collect(parseServerSentEvents(streamOf(["data: {nope\n\n"]))),
		).rejects.toMatchObject({ code: "invalid_stream" });
	});
});

describe("streamResponse", () => {
	const input = {
		instructions: "Be helpful.",
		messages: [{ role: "user" as const, content: "Hi" }],
		model: "gpt-test",
	};

	it("sends a plan-usage compatible Responses request", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(sseResponse([sse(delta("ok"), completed)]));

		await collect(streamResponse("token-1", input, fetch));

		const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
		expect(url).toBe("https://api.openai.com/v1/responses");
		expect(init.method).toBe("POST");
		const headers = new Headers(init.headers);
		expect(headers.get("authorization")).toBe("Bearer token-1");
		expect(headers.get("accept")).toBe("text/event-stream");
		expect(JSON.parse(init.body as string)).toEqual({
			model: "gpt-test",
			instructions: "Be helpful.",
			input: [{ role: "user", content: "Hi" }],
			store: false,
			stream: true,
		});
		expect(init.redirect).toBe("error");
	});

	it("yields text deltas until response.completed", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(
				sseResponse([
					sse(
						{ type: "response.created" },
						delta("Hello"),
						{ type: "response.output_text.done" },
						delta(", world"),
						completed,
						delta("ignored after completion"),
					),
				]),
			);

		await expect(collect(streamResponse("t", input, fetch))).resolves.toEqual([
			"Hello",
			", world",
		]);
	});

	it("throws mapped errors from response.failed", async () => {
		const fetch = vi.fn().mockResolvedValue(
			sseResponse([
				sse(delta("partial"), {
					type: "response.failed",
					response: {
						error: { code: "subscription_sharing_usage_limit_exceeded" },
					},
				}),
			]),
		);
		const seen: string[] = [];

		await expect(async () => {
			for await (const text of streamResponse("t", input, fetch))
				seen.push(text);
		}).rejects.toMatchObject({
			code: "subscription_sharing_usage_limit_exceeded",
		});
		expect(seen).toEqual(["partial"]);
	});

	it("throws mapped errors from error events", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(
				sseResponse([sse({ type: "error", code: "model_not_found" })]),
			);

		await expect(
			collect(streamResponse("t", input, fetch)),
		).rejects.toMatchObject({
			code: "model_not_found",
		});
	});

	it("treats response.incomplete as a retryable failure", async () => {
		const fetch = vi
			.fn()
			.mockResolvedValue(sseResponse([sse({ type: "response.incomplete" })]));

		await expect(
			collect(streamResponse("t", input, fetch)),
		).rejects.toMatchObject({
			code: "response_incomplete",
			retryable: true,
		});
	});

	it("fails when the stream ends without completion", async () => {
		const fetch = vi.fn().mockResolvedValue(sseResponse([sse(delta("cut"))]));

		await expect(
			collect(streamResponse("t", input, fetch)),
		).rejects.toMatchObject({
			code: "stream_interrupted",
		});
	});

	it("maps non-2xx responses", async () => {
		const fetch = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ error: { code: "model_not_found" } }), {
				status: 404,
			}),
		);

		await expect(
			collect(streamResponse("t", input, fetch)),
		).rejects.toMatchObject({
			code: "model_not_found",
			status: 404,
		});
	});

	it("maps network errors and cancellations", async () => {
		const failing = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
		await expect(
			collect(streamResponse("t", input, failing)),
		).rejects.toMatchObject({ code: "network_error", retryable: true });

		const controller = new AbortController();
		controller.abort();
		await expect(
			collect(
				streamResponse("t", { ...input, signal: controller.signal }, failing),
			),
		).rejects.toMatchObject({ code: "cancelled" });
	});
});

describe("listModels", () => {
	it("returns listed models only", async () => {
		const fetch = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					models: [
						{ slug: "gpt-a", display_name: "GPT A", visibility: "list" },
						{ slug: "gpt-hidden", display_name: "Hidden", visibility: "hide" },
						{ slug: "", display_name: "Blank", visibility: "list" },
						{ slug: "gpt-b", display_name: "GPT B", visibility: "list" },
						null,
					],
				}),
			),
		);

		await expect(listModels("token-1", fetch)).resolves.toEqual([
			{ slug: "gpt-a", displayName: "GPT A" },
			{ slug: "gpt-b", displayName: "GPT B" },
		]);
		const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
		expect(url).toBe("https://api.openai.com/v1/models");
		expect(new Headers(init.headers).get("authorization")).toBe(
			"Bearer token-1",
		);
	});

	it("rejects unexpected catalogs", async () => {
		const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({})));

		await expect(listModels("t", fetch)).rejects.toMatchObject({
			code: "invalid_model_catalog",
		});
	});

	it("maps API errors", async () => {
		const fetch = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					error: { code: "subscription_sharing_user_not_eligible" },
				}),
				{ status: 403 },
			),
		);

		await expect(listModels("t", fetch)).rejects.toMatchObject({
			code: "subscription_sharing_user_not_eligible",
		});
	});

	it("maps network errors", async () => {
		const fetch = vi.fn().mockRejectedValue(new TypeError("offline"));

		await expect(listModels("t", fetch)).rejects.toMatchObject({
			code: "network_error",
		});
	});
});
