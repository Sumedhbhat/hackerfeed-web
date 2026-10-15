import "@tanstack/react-start/server-only";

type AiProviderErrorOptions = {
	retryable?: boolean;
	/** The stored connection is unusable; clear it so the user reconnects. */
	requiresReconnect?: boolean;
	status?: number;
};

/** Error with a user-safe message. Adapters must never put provider text in it. */
export class AiProviderError extends Error {
	readonly code: string;
	readonly retryable: boolean;
	readonly requiresReconnect: boolean;
	readonly status?: number;

	constructor(
		code: string,
		message: string,
		{
			retryable = false,
			requiresReconnect = false,
			status,
		}: AiProviderErrorOptions = {},
	) {
		super(message);
		this.name = "AiProviderError";
		this.code = code;
		this.retryable = retryable;
		this.requiresReconnect = requiresReconnect;
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

export class AiProviderNotFoundError extends AiProviderError {
	constructor() {
		super("provider_not_found", "That AI provider isn't available.");
		this.name = "AiProviderNotFoundError";
	}
}

export class AiProviderNotConnectedError extends AiProviderError {
	constructor(providerName: string) {
		super(
			"provider_not_connected",
			`Connect ${providerName} from your profile to start chatting.`,
		);
		this.name = "AiProviderNotConnectedError";
	}
}

export function networkError(providerName: string) {
	return new AiProviderError(
		"network_error",
		`Could not reach ${providerName}. Check your connection and try again.`,
		{ retryable: true },
	);
}
