import "@tanstack/react-start/server-only";

import type { ChatGptModel, ChatMessage } from "#/lib/chatgpt/schemas";
import { ChatGptError, toChatGptError } from "./errors";
import { CHATGPT_RESOURCE } from "./oauth";

/**
 * Plan-usage inference against the public Responses API.
 * https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference
 */
export type ChatGptInputMessage = ChatMessage;

type FetchFn = typeof fetch;

export async function listModels(
	accessToken: string,
	fetchFn: FetchFn = fetch,
): Promise<ChatGptModel[]> {
	let response: Response;
	try {
		response = await fetchFn(`${CHATGPT_RESOURCE}/models`, {
			headers: {
				accept: "application/json",
				authorization: `Bearer ${accessToken}`,
			},
			redirect: "error",
		});
	} catch {
		throw new ChatGptError(
			"network_error",
			"Could not reach ChatGPT. Check your connection and try again.",
			{ retryable: true },
		);
	}

	const body = (await response.json().catch(() => null)) as {
		models?: unknown;
	} | null;
	if (!response.ok) throw toChatGptError(body, response.status);
	if (!body || !Array.isArray(body.models)) {
		throw new ChatGptError(
			"invalid_model_catalog",
			"ChatGPT returned an unexpected model list. Try again.",
			{ retryable: true },
		);
	}

	return body.models.flatMap((model: unknown) => {
		if (!model || typeof model !== "object") return [];
		const { slug, display_name, visibility } = model as Record<string, unknown>;
		if (
			visibility !== "list" ||
			typeof slug !== "string" ||
			!slug.trim() ||
			typeof display_name !== "string" ||
			!display_name.trim()
		) {
			return [];
		}
		return [{ slug, displayName: display_name }];
	});
}

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
			throw new ChatGptError(
				"invalid_stream",
				"ChatGPT sent an invalid response. Try again.",
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

export async function* streamResponse(
	accessToken: string,
	{
		instructions,
		messages,
		model,
		signal,
	}: {
		instructions: string;
		messages: ChatGptInputMessage[];
		model: string;
		signal?: AbortSignal;
	},
	fetchFn: FetchFn = fetch,
): AsyncGenerator<string> {
	let response: Response;
	try {
		response = await fetchFn(`${CHATGPT_RESOURCE}/responses`, {
			method: "POST",
			headers: {
				accept: "text/event-stream",
				authorization: `Bearer ${accessToken}`,
				"content-type": "application/json",
			},
			// Plan usage requires store=false and stream=true, with the full
			// history in `input` (previous_response_id is unsupported).
			body: JSON.stringify({
				model,
				instructions,
				input: messages.map(({ role, content }) => ({ role, content })),
				store: false,
				stream: true,
			}),
			redirect: "error",
			signal,
		});
	} catch {
		if (signal?.aborted) {
			throw new ChatGptError("cancelled", "The response was cancelled.");
		}
		throw new ChatGptError(
			"network_error",
			"Could not reach ChatGPT. Check your connection and try again.",
			{ retryable: true },
		);
	}

	if (!response.ok) {
		throw toChatGptError(
			await response.json().catch(() => null),
			response.status,
		);
	}
	if (!response.body) {
		throw new ChatGptError(
			"invalid_stream",
			"ChatGPT did not return a response stream.",
			{ retryable: true },
		);
	}

	for await (const event of parseServerSentEvents(response.body)) {
		if (!event || typeof event !== "object") continue;
		const { type, delta, response: detail } = event as Record<string, unknown>;

		if (type === "response.output_text.delta" && typeof delta === "string") {
			yield delta;
		} else if (type === "response.completed") {
			return;
		} else if (type === "response.failed") {
			throw toChatGptError(detail, response.status);
		} else if (type === "error") {
			throw toChatGptError(event, response.status);
		} else if (type === "response.incomplete") {
			throw new ChatGptError(
				"response_incomplete",
				"ChatGPT stopped before finishing its answer.",
				{ retryable: true },
			);
		}
	}

	throw new ChatGptError(
		"stream_interrupted",
		"The response ended before it was complete. Try again.",
		{ retryable: true },
	);
}
