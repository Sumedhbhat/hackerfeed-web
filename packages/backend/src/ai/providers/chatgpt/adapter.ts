import "@tanstack/react-start/server-only";

import { AiProviderError } from "../../errors";
import type { AiProviderAdapter } from "../../types";
import {
	CHATGPT_PLAN_USAGE_SCOPE,
	type ChatGptOAuthConfig,
	type ChatGptTokenSet,
	createAuthorizationRequest,
	exchangeAuthorizationCode,
	isLoopbackRedirect,
	isValidIssuedClientId,
	refreshAccessToken,
	revokeRefreshToken,
	verifyIdToken,
} from "./oauth";
import { listModels, streamResponse } from "./responses";

export const CHATGPT_PROVIDER_ID = "chatgpt";

function assertPlanUsageGranted(scopes: string[]) {
	if (!scopes.includes(CHATGPT_PLAN_USAGE_SCOPE)) {
		throw new AiProviderError(
			"plan_usage_not_granted",
			"ChatGPT didn't grant access to your plan. Connect again and allow HackerFeed to use it.",
			{ requiresReconnect: true },
		);
	}
}

function withoutIdToken({ idToken: _idToken, ...tokens }: ChatGptTokenSet) {
	return tokens;
}

/**
 * Sign in with ChatGPT: users spend their own ChatGPT plan through the
 * Responses API. https://developers.openai.com/siwc
 */
export function createChatGptAdapter(
	config: ChatGptOAuthConfig = {},
): AiProviderAdapter {
	const fetchFn = config.fetch ?? fetch;
	const oauthConfig = { ...config, fetch: fetchFn };

	const canAuthorize = (redirectUri: string) =>
		Boolean(config.clientId) || isLoopbackRedirect(redirectUri);

	return {
		id: CHATGPT_PROVIDER_ID,
		canAuthorize,

		async createAuthorization({ registration, redirectUri, loginHint }) {
			if (!canAuthorize(redirectUri)) {
				throw new AiProviderError(
					"provider_unavailable",
					"ChatGPT sign-in isn't configured for this deployment.",
				);
			}
			const clientId = config.clientId ?? registration?.clientId ?? null;
			// OpenAI asks for a stable id per installation to scope registrations.
			const hostId =
				registration?.metadata.hostId ?? `urn:uuid:${crypto.randomUUID()}`;
			const request = await createAuthorizationRequest({
				clientId,
				hostId,
				loginHint,
				redirectUri,
			});
			return {
				url: request.url,
				state: request.state,
				pending: {
					clientId,
					codeVerifier: request.codeVerifier,
					hostId,
					nonce: request.nonce,
				},
			};
		},

		async completeAuthorization({ callback, pending, redirectUri }) {
			const code = callback.get("code") ?? "";
			const returnedClientIds = callback.getAll("client_id");
			const returnedClientId = returnedClientIds[0] ?? null;
			// Dynamic registration returns the issued client id on the callback.
			const clientId = pending.clientId ?? returnedClientId;
			if (
				returnedClientIds.length > 1 ||
				!isValidIssuedClientId(clientId) ||
				(pending.clientId !== null &&
					returnedClientId !== null &&
					returnedClientId !== pending.clientId) ||
				!pending.codeVerifier ||
				!pending.nonce ||
				!pending.hostId
			) {
				throw new AiProviderError(
					"registration_incomplete",
					"ChatGPT didn't finish registering HackerFeed. Try connecting again.",
				);
			}

			const tokens = await exchangeAuthorizationCode(
				{ clientId, code, codeVerifier: pending.codeVerifier, redirectUri },
				oauthConfig,
			);
			const identity = await verifyIdToken(
				tokens.idToken ?? "",
				{ clientId, nonce: pending.nonce },
				oauthConfig,
			);
			assertPlanUsageGranted(tokens.scopes);

			return {
				registration: { clientId, metadata: { hostId: pending.hostId } },
				identity,
				tokens: withoutIdToken(tokens),
			};
		},

		async refresh({ registration, refreshToken, scopes }) {
			const clientId = registration.clientId ?? config.clientId;
			if (!clientId) {
				throw new AiProviderError(
					"registration_incomplete",
					"Your ChatGPT connection is incomplete. Reconnect it from your profile.",
					{ requiresReconnect: true },
				);
			}
			const tokens = await refreshAccessToken(
				{ clientId, refreshToken, scopes },
				oauthConfig,
			);
			const identity = tokens.idToken
				? await verifyIdToken(tokens.idToken, { clientId }, oauthConfig)
				: null;
			assertPlanUsageGranted(tokens.scopes);
			return { tokens: withoutIdToken(tokens), identity };
		},

		async revoke({ registration, refreshToken }) {
			const clientId = registration.clientId ?? config.clientId;
			if (!clientId) return;
			await revokeRefreshToken({ clientId, refreshToken }, oauthConfig);
		},

		listModels: (accessToken) => listModels(accessToken, fetchFn),

		streamReply: (accessToken, input) =>
			streamResponse(accessToken, input, fetchFn),
	};
}
