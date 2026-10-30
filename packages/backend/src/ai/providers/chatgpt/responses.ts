import "@tanstack/react-start/server-only";

import type { AiModel } from "@hackerfeed/contracts/ai";
import { AiProviderError, networkError } from "../../errors";
import { parseServerSentEvents } from "../../sse";
import type { AiChatInput } from "../../types";
import { toChatGptError } from "./errors";
import { CHATGPT_RESOURCE } from "./oauth";

/**
 * Plan-usage inference against the public Responses API.
 * https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference
 */
type FetchFn = typeof fetch;

export async function listModels(
	accessToken: string,
	fetchFn: FetchFn = fetch,
): Promise<AiModel[]> {
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
		throw networkError("ChatGPT");
	}

	const body = (await response.json().catch(() => null)) as {
		models?: unknown;
	} | null;
	if (!response.ok) throw toChatGptError(body, response.status);
	if (!body || !Array.isArray(body.models)) {
		throw new AiProviderError(
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

export async function* streamResponse(
	accessToken: string,
	{ instructions, messages, model, signal }: AiChatInput,
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
			throw new AiProviderError("cancelled", "The response was cancelled.");
		}
		throw networkError("ChatGPT");
	}

	if (!response.ok) {
		throw toChatGptError(
			await response.json().catch(() => null),
			response.status,
		);
	}
	if (!response.body) {
		throw new AiProviderError(
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
			throw new AiProviderError(
				"response_incomplete",
				"ChatGPT stopped before finishing its answer.",
				{ retryable: true },
			);
		}
	}

	throw new AiProviderError(
		"stream_interrupted",
		"The response ended before it was complete. Try again.",
		{ retryable: true },
	);
}
