import "@tanstack/react-start/server-only";

import type { ChatGptStatus } from "#/lib/chatgpt/schemas";
import {
	type AuthenticatedWorkosUser,
	resolveCurrentWorkosUser,
} from "#/server/auth/current-user";
import {
	ChatGptError,
	ChatGptNotConnectedError,
	requiresReauthentication,
} from "./errors";
import {
	CHATGPT_PLAN_USAGE_SCOPE,
	type ChatGptOAuthConfig,
	type ChatGptTokenSet,
	canStartAuthorization,
	createAuthorizationRequest,
	exchangeAuthorizationCode,
	isValidIssuedClientId,
	refreshAccessToken,
	revokeRefreshToken,
	verifyIdToken,
} from "./oauth";
import type { ChatGptConnectionRepository } from "./repository";
import {
	type ChatGptInputMessage,
	listModels,
	streamResponse,
} from "./responses";
import type { TokenCipher } from "./token-crypto";

/** Refresh slightly before expiry so a streamed reply doesn't outlive its token. */
const REFRESH_LEEWAY_MS = 60_000;

/** Pending authorization, sealed into a short-lived cookie between redirects. */
export type ChatGptAuthorizationFlow = {
	clientId: string | null;
	codeVerifier: string;
	hostId: string;
	nonce: string;
	redirectUri: string;
	returnTo: string;
	state: string;
	workosUserId: string;
};

type CurrentUserInput = Parameters<typeof resolveCurrentWorkosUser>[0];

type UserServiceDependency = {
	getOrCreateAppUser(
		identity: AuthenticatedWorkosUser,
	): PromiseLike<{ id: string }>;
};

export type ChatGptServiceDependencies = {
	cipher: TokenCipher;
	connections: Pick<
		ChatGptConnectionRepository,
		"findByAppUserId" | "save" | "updateTokens" | "clearTokens"
	>;
	oauth: ChatGptOAuthConfig;
	users: UserServiceDependency;
	fetch?: typeof fetch;
};

export function createChatGptService({
	cipher,
	connections,
	oauth,
	users,
	fetch: fetchFn = fetch,
}: ChatGptServiceDependencies) {
	const oauthConfig = { ...oauth, fetch: oauth.fetch ?? fetchFn };

	async function getAppUser(user: CurrentUserInput) {
		return users.getOrCreateAppUser(resolveCurrentWorkosUser(user));
	}

	async function sealTokens(tokens: ChatGptTokenSet) {
		return {
			accessToken: await cipher.encrypt(tokens.accessToken),
			refreshToken: tokens.refreshToken
				? await cipher.encrypt(tokens.refreshToken)
				: null,
			accessTokenExpiresAt: tokens.expiresAt,
			scopes: tokens.scopes.join(" "),
		};
	}

	function assertPlanUsageGranted(scopes: string[]) {
		if (!scopes.includes(CHATGPT_PLAN_USAGE_SCOPE)) {
			throw new ChatGptError(
				"plan_usage_not_granted",
				"ChatGPT didn't grant access to your plan. Connect again and allow HackerFeed to use it.",
			);
		}
	}

	async function getAccessToken(user: CurrentUserInput): Promise<string> {
		const appUser = await getAppUser(user);
		const connection = await connections.findByAppUserId(appUser.id);
		const accessToken = connection?.accessToken
			? await cipher.decrypt(connection.accessToken)
			: null;
		if (!connection || !accessToken) throw new ChatGptNotConnectedError();

		const expiresAt = connection.accessTokenExpiresAt ?? 0;
		if (expiresAt - REFRESH_LEEWAY_MS > Date.now()) return accessToken;

		const refreshToken = connection.refreshToken
			? await cipher.decrypt(connection.refreshToken)
			: null;
		if (!refreshToken) {
			await connections.clearTokens(appUser.id);
			throw new ChatGptNotConnectedError();
		}

		let tokens: ChatGptTokenSet;
		try {
			tokens = await refreshAccessToken(
				{
					clientId: connection.clientId,
					refreshToken,
					scopes: connection.scopes.split(" ").filter(Boolean),
				},
				oauthConfig,
			);
			if (tokens.idToken) {
				const identity = await verifyIdToken(
					tokens.idToken,
					{ clientId: connection.clientId },
					oauthConfig,
				);
				if (identity.subject !== connection.subject) {
					throw new ChatGptError(
						"account_mismatch",
						"ChatGPT returned a different account. Reconnect from your profile.",
					);
				}
			}
			assertPlanUsageGranted(tokens.scopes);
		} catch (error) {
			if (
				requiresReauthentication(error) ||
				(error instanceof ChatGptError &&
					(error.code === "account_mismatch" ||
						error.code === "plan_usage_not_granted"))
			) {
				await connections.clearTokens(appUser.id);
			}
			throw error;
		}

		await connections.updateTokens(appUser.id, await sealTokens(tokens));
		return tokens.accessToken;
	}

	return {
		async getStatus(
			user: CurrentUserInput,
			redirectUri: string,
		): Promise<ChatGptStatus> {
			const appUser = await getAppUser(user);
			const connection = await connections.findByAppUserId(appUser.id);
			const connected = Boolean(connection?.accessToken);
			return {
				canConnect: canStartAuthorization(oauthConfig, redirectUri),
				connected,
				email: connected ? (connection?.email ?? null) : null,
				name: connected ? (connection?.name ?? null) : null,
			};
		},

		async startAuthorization(
			user: CurrentUserInput,
			{ redirectUri, returnTo }: { redirectUri: string; returnTo: string },
		) {
			const identity = resolveCurrentWorkosUser(user);
			if (!canStartAuthorization(oauthConfig, redirectUri)) {
				throw new ChatGptError(
					"chatgpt_unavailable",
					"ChatGPT sign-in isn't configured for this deployment.",
				);
			}

			const appUser = await users.getOrCreateAppUser(identity);
			const existing = await connections.findByAppUserId(appUser.id);
			const clientId = oauthConfig.clientId ?? existing?.clientId ?? null;
			const hostId = existing?.hostId ?? `urn:uuid:${crypto.randomUUID()}`;
			const request = await createAuthorizationRequest({
				clientId,
				hostId,
				loginHint: existing?.email,
				redirectUri,
			});

			const flow: ChatGptAuthorizationFlow = {
				clientId,
				codeVerifier: request.codeVerifier,
				hostId,
				nonce: request.nonce,
				redirectUri,
				returnTo,
				state: request.state,
				workosUserId: identity.workosUserId,
			};
			return { flow, url: request.url };
		},

		async completeAuthorization(
			user: CurrentUserInput,
			flow: ChatGptAuthorizationFlow,
			{
				code,
				clientId: returnedClientId,
			}: { code: string; clientId: string | null },
		): Promise<void> {
			const identity = resolveCurrentWorkosUser(user);
			if (identity.workosUserId !== flow.workosUserId) {
				throw new ChatGptError(
					"session_mismatch",
					"You signed in to HackerFeed as someone else. Try connecting again.",
				);
			}

			// Dynamic registration returns the issued client id on the callback.
			const clientId = flow.clientId ?? returnedClientId;
			if (
				!isValidIssuedClientId(clientId) ||
				(flow.clientId !== null &&
					returnedClientId !== null &&
					returnedClientId !== flow.clientId)
			) {
				throw new ChatGptError(
					"registration_incomplete",
					"ChatGPT didn't finish registering HackerFeed. Try connecting again.",
				);
			}

			const tokens = await exchangeAuthorizationCode(
				{
					clientId,
					code,
					codeVerifier: flow.codeVerifier,
					redirectUri: flow.redirectUri,
				},
				oauthConfig,
			);
			const chatGptIdentity = await verifyIdToken(
				tokens.idToken ?? "",
				{ clientId, nonce: flow.nonce },
				oauthConfig,
			);
			assertPlanUsageGranted(tokens.scopes);

			const appUser = await users.getOrCreateAppUser(identity);
			await connections.save(appUser.id, {
				clientId,
				hostId: flow.hostId,
				subject: chatGptIdentity.subject,
				email: chatGptIdentity.email,
				name: chatGptIdentity.name,
				...(await sealTokens(tokens)),
			});
		},

		async disconnect(user: CurrentUserInput): Promise<void> {
			const appUser = await getAppUser(user);
			const connection = await connections.findByAppUserId(appUser.id);
			if (!connection?.accessToken) return;

			const refreshToken = connection.refreshToken
				? await cipher.decrypt(connection.refreshToken)
				: null;
			await connections.clearTokens(appUser.id);
			if (refreshToken) {
				await revokeRefreshToken(
					{ clientId: connection.clientId, refreshToken },
					oauthConfig,
				);
			}
		},

		async listModels(user: CurrentUserInput) {
			return listModels(await getAccessToken(user), fetchFn);
		},

		/** Resolves credentials up front so callers can report auth errors before streaming. */
		async startChat(
			user: CurrentUserInput,
			input: {
				instructions: string;
				messages: ChatGptInputMessage[];
				model: string;
				signal?: AbortSignal;
			},
		): Promise<AsyncGenerator<string>> {
			const accessToken = await getAccessToken(user);
			return streamResponse(accessToken, input, fetchFn);
		},
	};
}

export type ChatGptService = ReturnType<typeof createChatGptService>;
