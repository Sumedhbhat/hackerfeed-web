import "@tanstack/react-start/server-only";

import { AiProviderError } from "./errors";

/** Splits a server-sent event stream into parsed `data:` JSON payloads. */
export async function* parseServerSentEvents(
	body: ReadableStream<Uint8Array>,
): AsyncGenerator<unknown> {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	const parseEvent = (block: string) => {
		const data = block
			.split(/\r?\n/)
			.filter((line) => line.startsWith("data:"))
			.map((line) => line.slice(5).trimStart())
			.join("\n");
		if (!data || data === "[DONE]") return undefined;
		try {
			return JSON.parse(data) as unknown;
		} catch {
			throw new AiProviderError(
				"invalid_stream",
				"The AI provider sent an invalid response. Try again.",
				{ retryable: true },
			);
		}
	};

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			const blocks = buffer.split(/\r?\n\r?\n/);
			buffer = blocks.pop() ?? "";
			for (const block of blocks) {
				const event = parseEvent(block);
				if (event !== undefined) yield event;
			}
		}
		const event = parseEvent(buffer + decoder.decode());
		if (event !== undefined) yield event;
	} finally {
		reader.releaseLock();
	}
}
