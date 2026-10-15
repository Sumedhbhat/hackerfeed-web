import type {
	AiApiError,
	AiModel,
	AiProviderStatus,
	ChatStreamEvent,
	StoryChatRequest,
} from "./schemas";

export class AiRequestError extends Error {
	readonly code: string;
	readonly retryable: boolean;
	readonly status: number;

	constructor(
		{ code, message, retryable = false }: AiApiError,
		status: number,
	) {
		super(message);
		this.name = "AiRequestError";
		this.code = code;
		this.retryable = retryable;
		this.status = status;
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
		response.status,
	);
}

async function getJson<T>(path: string): Promise<T> {
	const response = await fetch(path, {
		credentials: "same-origin",
		headers: { accept: "application/json" },
	});
	if (!response.ok) throw await toRequestError(response);
	return (await response.json()) as T;
}

export async function fetchAiProviders(): Promise<AiProviderStatus[]> {
	const { providers } = await getJson<{ providers: AiProviderStatus[] }>(
		"/api/ai/providers",
	);
	return providers;
}

export async function fetchAiModels(providerId: string): Promise<AiModel[]> {
	const { models } = await getJson<{ models: AiModel[] }>(
		`/api/ai/providers/${encodeURIComponent(providerId)}/models`,
	);
	return models;
}

export async function disconnectAiProvider(providerId: string): Promise<void> {
	const response = await fetch(
		`/api/ai/providers/${encodeURIComponent(providerId)}/disconnect`,
		{ method: "POST", credentials: "same-origin" },
	);
	if (!response.ok) throw await toRequestError(response);
}

export function getAiConnectUrl(providerId: string, returnTo: string): string {
	return `/ai/${encodeURIComponent(providerId)}/connect?returnTo=${encodeURIComponent(returnTo)}`;
}

export function connectAiProvider(
	providerId: string,
	returnTo = window.location.pathname,
) {
	window.location.assign(getAiConnectUrl(providerId, returnTo));
}

/**
 * Streams a story chat reply. Resolves when the reply completes; rejects with
 * AiRequestError on failure (after any partial text was delivered).
 */
export async function streamStoryChat(
	request: StoryChatRequest,
	{
		onDelta,
		signal,
	}: { onDelta: (text: string) => void; signal?: AbortSignal },
): Promise<void> {
	const response = await fetch("/api/ai/chat", {
		method: "POST",
		credentials: "same-origin",
		headers: {
			accept: "application/x-ndjson",
			"content-type": "application/json",
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
			response.status,
		);
	}

	const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
	let buffer = "";

	const handleLine = (line: string): boolean => {
		if (!line.trim()) return false;
		const event = JSON.parse(line) as ChatStreamEvent;
		if (event.type === "delta") onDelta(event.text);
		if (event.type === "error") {
			throw new AiRequestError(event, response.status);
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
		response.status,
	);
}
