import "@tanstack/react-start/server-only";

import type { AiModel, ChatMessage } from "#/lib/ai/schemas";

/** A user's OAuth client registration with a provider. */
export type AiProviderRegistration = {
	clientId: string | null;
	metadata: Record<string, string>;
};

export type AiProviderTokenSet = {
	accessToken: string;
	refreshToken: string | null;
	/** Epoch milliseconds. */
	expiresAt: number;
	scopes: string[];
};

export type AiProviderIdentity = {
	/** Stable account id at the provider. */
	subject: string;
	email: string | null;
	name: string | null;
};

/** Provider-specific values kept (sealed) between the redirect and callback. */
export type AiProviderPendingAuthorization = Record<string, string | null>;

export type AiChatInput = {
	instructions: string;
	messages: ChatMessage[];
	model: string;
	signal?: AbortSignal;
};

/**
 * Everything provider-specific about "bring your own AI subscription".
 * HackerFeed handles sessions, storage, encryption, token expiry, and UI;
 * an adapter only speaks its provider's OAuth and inference protocols.
 *
 * To add a provider: implement this, register it in `runtime.ts`, and add a
 * row to the `ai_providers` table with the same `id`.
 */
export interface AiProviderAdapter {
	readonly id: string;

	/** Whether sign-in can start for this redirect URI (e.g. client id configured). */
	canAuthorize(redirectUri: string): boolean;

	createAuthorization(input: {
		registration: AiProviderRegistration | null;
		redirectUri: string;
		loginHint: string | null;
	}): Promise<{
		url: string;
		state: string;
		pending: AiProviderPendingAuthorization;
	}>;

	/** Exchanges the callback for tokens and a verified identity. */
	completeAuthorization(input: {
		callback: URLSearchParams;
		pending: AiProviderPendingAuthorization;
		redirectUri: string;
	}): Promise<{
		registration: AiProviderRegistration;
		identity: AiProviderIdentity;
		tokens: AiProviderTokenSet;
	}>;

	/**
	 * Renews tokens. Returns the identity when the provider re-asserts it so the
	 * caller can confirm it's the same account.
	 */
	refresh(input: {
		registration: AiProviderRegistration;
		refreshToken: string;
		scopes: string[];
	}): Promise<{
		tokens: AiProviderTokenSet;
		identity: AiProviderIdentity | null;
	}>;

	/** Best-effort revocation; must not throw. */
	revoke(input: {
		registration: AiProviderRegistration;
		refreshToken: string;
	}): Promise<void>;

	listModels(accessToken: string): Promise<AiModel[]>;

	/** Yields reply text deltas; throws AiProviderError on failure. */
	streamReply(accessToken: string, input: AiChatInput): AsyncGenerator<string>;
}
