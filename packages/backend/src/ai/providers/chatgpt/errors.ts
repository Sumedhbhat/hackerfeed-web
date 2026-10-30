import "@tanstack/react-start/server-only";

import { AiProviderError } from "../../errors";

const RECONNECT =
	"Your ChatGPT connection has expired. Reconnect it from your profile.";

// Known OpenAI error codes mapped to user-safe messages. Server messages are
// never forwarded because validation errors can echo submitted text.
const KNOWN_ERRORS: Record<
	string,
	{ message: string; retryable?: boolean; requiresReconnect?: boolean }
> = {
	subscription_sharing_user_not_eligible: {
		message: "Your ChatGPT plan or workspace can't be used in other apps.",
	},
	subscription_sharing_usage_limit_exceeded: {
		message:
			"You've reached a ChatGPT usage limit. Check your usage in ChatGPT settings.",
	},
	subscription_sharing_usage_unavailable: {
		message: "ChatGPT usage couldn't be checked. Try again shortly.",
		retryable: true,
	},
	subscription_sharing_user_unavailable: {
		message:
			"Your ChatGPT account is temporarily unavailable. Try again shortly.",
		retryable: true,
	},
	subscription_sharing_v2_client_not_enabled: {
		message: "HackerFeed isn't enabled for ChatGPT plan usage yet.",
	},
	model_not_found: {
		message:
			"That model isn't available for your ChatGPT account. Pick another one.",
	},
	access_denied: { message: "ChatGPT sign-in was cancelled." },
	invalid_grant: { message: RECONNECT, requiresReconnect: true },
	invalid_refresh_token: { message: RECONNECT, requiresReconnect: true },
	token_expired: { message: RECONNECT, requiresReconnect: true },
	refresh_token_expired: { message: RECONNECT, requiresReconnect: true },
	refresh_token_invalidated: { message: RECONNECT, requiresReconnect: true },
	refresh_token_reused: { message: RECONNECT, requiresReconnect: true },
};

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

export function toChatGptError(
	body: unknown,
	status?: number,
): AiProviderError {
	const rawCode = getErrorCode(body);
	const code = /^[a-zA-Z0-9_.-]{1,100}$/.test(rawCode) ? rawCode : "api_error";
	const known = KNOWN_ERRORS[code];
	const create = (message: string, retryable = false) =>
		new AiProviderError(code, message, { retryable, status });

	if (known) {
		return new AiProviderError(code, known.message, {
			retryable: known.retryable,
			requiresReconnect: known.requiresReconnect,
			status,
		});
	}
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
