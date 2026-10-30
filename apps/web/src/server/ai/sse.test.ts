import { describe, expect, it } from "vitest";
import { parseServerSentEvents } from "./sse";

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

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
	const items: T[] = [];
	for await (const item of iterable) items.push(item);
	return items;
}

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
