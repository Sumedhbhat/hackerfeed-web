import "@tanstack/react-start/server-only";

export class ChatGptError extends Error {
	readonly code: string;
	readonly retryable: boolean;
	readonly status?: number;

	constructor(
		code: string,
		message: string,
		{
			retryable = false,
			status,
		}: { retryable?: boolean; status?: number } = {},
	) {
		super(message);
		this.name = "ChatGptError";
		this.code = code;
		this.retryable = retryable;
		this.status = status;
	}

	toJSON() {
		return {
			code: this.code,
			message: this.message,
			retryable: this.retryable,
		};
	}
}

export class ChatGptNotConnectedError extends ChatGptError {
	constructor() {
		super(
			"chatgpt_not_connected",
			"Connect your ChatGPT account from your profile to start chatting.",
		);
		this.name = "ChatGptNotConnectedError";
	}
}

const RECONNECT =
	"Your ChatGPT connection has expired. Reconnect it from your profile.";

// Known OpenAI error codes, mapped to user-safe messages. Server messages are
// never forwarded because validation errors can echo submitted text.
const KNOWN_ERRORS: Record<string, [message: string, retryable: boolean]> = {
	subscription_sharing_user_not_eligible: [
		"Your ChatGPT plan or workspace can't be used in other apps.",
		false,
	],
	subscription_sharing_usage_limit_exceeded: [
		"You've reached a ChatGPT usage limit. Check your usage in ChatGPT settings.",
		false,
	],
	subscription_sharing_usage_unavailable: [
		"ChatGPT usage couldn't be checked. Try again shortly.",
		true,
	],
	subscription_sharing_user_unavailable: [
		"Your ChatGPT account is temporarily unavailable. Try again shortly.",
		true,
	],
	subscription_sharing_v2_client_not_enabled: [
		"HackerFeed isn't enabled for ChatGPT plan usage yet.",
		false,
	],
	model_not_found: [
		"That model isn't available for your ChatGPT account. Pick another one.",
		false,
	],
	access_denied: ["ChatGPT sign-in was cancelled.", false],
	invalid_grant: [RECONNECT, false],
	invalid_refresh_token: [RECONNECT, false],
	token_expired: [RECONNECT, false],
	refresh_token_expired: [RECONNECT, false],
	refresh_token_invalidated: [RECONNECT, false],
	refresh_token_reused: [RECONNECT, false],
};

const REAUTHENTICATION_CODES = new Set([
	"invalid_grant",
	"invalid_refresh_token",
	"token_expired",
	"refresh_token_expired",
	"refresh_token_invalidated",
	"refresh_token_reused",
]);

export function requiresReauthentication(error: unknown): boolean {
	return (
		error instanceof ChatGptError && REAUTHENTICATION_CODES.has(error.code)
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getErrorCode(body: unknown): string {
	let detail: unknown = body;
	for (let depth = 0; depth < 4 && isRecord(detail); depth += 1) {
		// OAuth errors use a string `error`; Responses errors nest `error.code`.
		if (typeof detail.error === "string") return detail.error;
		if (isRecord(detail.error)) detail = detail.error;
		else if (isRecord(detail.response)) detail = detail.response;
		else if (typeof detail.code === "string") return detail.code;
		else break;
	}
	return "api_error";
}

export function toChatGptError(body: unknown, status?: number): ChatGptError {
	const rawCode = getErrorCode(body);
	const code = /^[a-zA-Z0-9_.-]{1,100}$/.test(rawCode) ? rawCode : "api_error";
	const known = KNOWN_ERRORS[code];
	const create = (message: string, retryable = false) =>
		new ChatGptError(code, message, { retryable, status });

	if (known) return create(known[0], known[1]);
	if (status === 401) return create(RECONNECT);
	if (status === 429) {
		return create("Too many requests. Wait a moment and try again.", true);
	}
	if (status && status >= 500) {
		return create(
			"ChatGPT is temporarily unavailable. Try again shortly.",
			true,
		);
	}
	return create("ChatGPT couldn't complete this request.");
}
