import type {
	ChatGptApiError,
	ChatGptModel,
	ChatGptStatus,
	ChatStreamEvent,
	StoryChatRequest,
} from "./schemas";

export class ChatGptRequestError extends Error {
	readonly code: string;
	readonly retryable: boolean;
	readonly status: number;

	constructor(
		{ code, message, retryable = false }: ChatGptApiError,
		status: number,
	) {
		super(message);
		this.name = "ChatGptRequestError";
		this.code = code;
		this.retryable = retryable;
		this.status = status;
	}
}

async function toRequestError(
	response: Response,
): Promise<ChatGptRequestError> {
	const body = (await response
		.json()
		.catch(() => null)) as ChatGptApiError | null;
	return new ChatGptRequestError(
		body && typeof body.code === "string" && typeof body.message === "string"
			? body
			: {
					code: "request_failed",
					message: "Something went wrong talking to ChatGPT. Try again.",
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

export function fetchChatGptStatus(): Promise<ChatGptStatus> {
	return getJson<ChatGptStatus>("/api/chatgpt/status");
}

export async function fetchChatGptModels(): Promise<ChatGptModel[]> {
	const { models } = await getJson<{ models: ChatGptModel[] }>(
		"/api/chatgpt/models",
	);
	return models;
}

export async function disconnectChatGpt(): Promise<void> {
	const response = await fetch("/api/chatgpt/disconnect", {
		method: "POST",
		credentials: "same-origin",
	});
	if (!response.ok) throw await toRequestError(response);
}

export function getChatGptConnectUrl(returnTo: string): string {
	return `/chatgpt/connect?returnTo=${encodeURIComponent(returnTo)}`;
}

export function connectChatGpt(returnTo = window.location.pathname) {
	window.location.assign(getChatGptConnectUrl(returnTo));
}

/**
 * Streams a story chat reply. Resolves when the reply completes; rejects with
 * ChatGptRequestError on failure (after any partial text was delivered).
 */
export async function streamStoryChat(
	request: StoryChatRequest,
	{
		onDelta,
		signal,
	}: { onDelta: (text: string) => void; signal?: AbortSignal },
): Promise<void> {
	const response = await fetch("/api/chatgpt/chat", {
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
		throw new ChatGptRequestError(
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
		if (event.type === "error")
			throw new ChatGptRequestError(event, response.status);
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

	throw new ChatGptRequestError(
		{
			code: "stream_interrupted",
			message: "The response ended early. Try again.",
			retryable: true,
		},
		response.status,
	);
}
