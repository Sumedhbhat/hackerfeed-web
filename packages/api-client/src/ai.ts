import type {
	AiApiError,
	AiModel,
	AiProviderStatus,
	ChatStreamEvent,
	StoryChatRequest,
} from "@hackerfeed/contracts/ai";
import { readServerTraceId } from "@hackerfeed/runtime/trace-headers";
import * as Sentry from "@sentry/core";
import type { ApiAuth } from "./auth";

export class AiRequestError extends Error {
	readonly code: string;
	readonly retryable: boolean;
	readonly status: number;
	/** The Worker's trace for the failed request, when it got that far. */
	readonly traceId?: string;

	constructor(
		{ code, message, retryable = false }: AiApiError,
		response: Response,
	) {
		super(message);
		this.name = "AiRequestError";
		this.code = code;
		this.retryable = retryable;
		this.status = response.status;
		this.traceId = readServerTraceId(response);
	}
}

async function toRequestError(response: Response): Promise<AiRequestError> {
	const body = (await response.json().catch(() => null)) as AiApiError | null;
	return new AiRequestError(
		body && typeof body.code === "string" && typeof body.message === "string"
			? body
			: {
					code: "request_failed",
					message:
						"Something went wrong talking to the AI provider. Try again.",
					retryable: true,
				},
		response,
	);
}

async function getJson<T>(auth: ApiAuth, path: string): Promise<T> {
	const response = await fetch(path, {
		headers: { accept: "application/json", ...(await auth.getHeaders()) },
	});
	if (!response.ok) throw await toRequestError(response);
	return (await response.json()) as T;
}

async function fetchAiProviders(auth: ApiAuth): Promise<AiProviderStatus[]> {
	const { providers } = await getJson<{ providers: AiProviderStatus[] }>(
		auth,
		"/api/ai/providers",
	);
	return providers;
}

async function fetchAiModels(
	auth: ApiAuth,
	providerId: string,
): Promise<AiModel[]> {
	const { models } = await getJson<{ models: AiModel[] }>(
		auth,
		`/api/ai/providers/${encodeURIComponent(providerId)}/models`,
	);
	return models;
}

async function disconnectAiProvider(
	auth: ApiAuth,
	providerId: string,
): Promise<void> {
	const response = await fetch(
		`/api/ai/providers/${encodeURIComponent(providerId)}/disconnect`,
		{ method: "POST", headers: await auth.getHeaders() },
	);
	if (!response.ok) throw await toRequestError(response);
}

export function getAiConnectUrl(providerId: string, returnTo: string): string {
	return `/ai/${encodeURIComponent(providerId)}/connect?returnTo=${encodeURIComponent(returnTo)}`;
}

/** Starts the provider's sign-in, then leaves the page for the provider. */
async function connectAiProvider(
	auth: ApiAuth,
	providerId: string,
	returnTo = window.location.pathname,
): Promise<void> {
	const response = await fetch(getAiConnectUrl(providerId, returnTo), {
		method: "POST",
		headers: await auth.getHeaders(),
	});
	if (response.status === 401) return auth.signIn(returnTo);
	if (!response.ok) throw await toRequestError(response);
	const { url } = (await response.json()) as { url: string };
	window.location.assign(url);
}

type StreamOptions = {
	onDelta: (text: string) => void;
	signal?: AbortSignal;
};

/**
 * Streams a story chat reply. Resolves when the reply completes; rejects with
 * AiRequestError on failure (after any partial text was delivered).
 *
 * The whole reply is one span, failed if the stream breaks after its 200,
 * cancelled if the user stops it.
 */
function streamStoryChat(
	auth: ApiAuth,
	request: StoryChatRequest,
	options: StreamOptions,
): Promise<void> {
	return Sentry.startSpan(
		{
			name: "Story chat reply",
			op: "ai.chat",
			attributes: {
				"ai.provider": request.providerId,
				"ai.model": request.model,
			},
		},
		async (span) => {
			try {
				await readStoryChat(auth, request, options);
			} catch (error) {
				span.setStatus({
					code: Sentry.SPAN_STATUS_ERROR,
					message: options.signal?.aborted ? "cancelled" : "internal_error",
				});
				if (error instanceof AiRequestError) {
					span.setAttribute("ai.error_code", error.code);
				}
				throw error;
			}
		},
	);
}

async function readStoryChat(
	auth: ApiAuth,
	request: StoryChatRequest,
	{ onDelta, signal }: StreamOptions,
): Promise<void> {
	const response = await fetch("/api/ai/chat", {
		method: "POST",
		headers: {
			accept: "application/x-ndjson",
			"content-type": "application/json",
			...(await auth.getHeaders()),
		},
		body: JSON.stringify(request),
		signal,
	});
	if (!response.ok) throw await toRequestError(response);
	if (!response.body) {
		throw new AiRequestError(
			{
				code: "invalid_stream",
				message: "No response was received.",
				retryable: true,
			},
			response,
		);
	}

	const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
	let buffer = "";

	const handleLine = (line: string): boolean => {
		if (!line.trim()) return false;
		const event = JSON.parse(line) as ChatStreamEvent;
		if (event.type === "delta") onDelta(event.text);
		if (event.type === "error") {
			throw new AiRequestError(event, response);
		}
		return event.type === "done";
	};

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += value;
		const lines = buffer.split("\n");
		buffer = lines.pop() ?? "";
		for (const line of lines) {
			if (handleLine(line)) return;
		}
	}
	if (handleLine(buffer)) return;

	throw new AiRequestError(
		{
			code: "stream_interrupted",
			message: "The response ended early. Try again.",
			retryable: true,
		},
		response,
	);
}

/** The AI endpoints, sending `auth`'s headers with every request. */
export function createAiClient(auth: ApiAuth) {
	return {
		fetchAiProviders: () => fetchAiProviders(auth),
		fetchAiModels: (providerId: string) => fetchAiModels(auth, providerId),
		disconnectAiProvider: (providerId: string) =>
			disconnectAiProvider(auth, providerId),
		connectAiProvider: (providerId: string, returnTo?: string) =>
			connectAiProvider(auth, providerId, returnTo),
		streamStoryChat: (request: StoryChatRequest, options: StreamOptions) =>
			streamStoryChat(auth, request, options),
	};
}
