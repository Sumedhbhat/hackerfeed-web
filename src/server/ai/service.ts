import "@tanstack/react-start/server-only";

import type { AiProviderStatus } from "@hackerfeed/contracts/ai";
import {
	type AuthenticatedWorkosUser,
	resolveCurrentWorkosUser,
} from "#/server/auth/current-user";
import {
	AiProviderError,
	AiProviderNotConnectedError,
	AiProviderNotFoundError,
} from "./errors";
import type {
	AiProviderConnectionRow,
	AiProviderRepository,
	AiProviderRow,
} from "./repository";
import type { TokenCipher } from "./token-crypto";
import type {
	AiChatInput,
	AiProviderAdapter,
	AiProviderPendingAuthorization,
	AiProviderRegistration,
	AiProviderTokenSet,
} from "./types";

/** Refresh slightly before expiry so a streamed reply doesn't outlive its token. */
const REFRESH_LEEWAY_MS = 60_000;

/** Pending sign-in, sealed into a short-lived cookie between redirects. */
export type AiAuthorizationFlow = {
	providerId: string;
	state: string;
	workosUserId: string;
	redirectUri: string;
	returnTo: string;
	pending: AiProviderPendingAuthorization;
};

type CurrentUserInput = Parameters<typeof resolveCurrentWorkosUser>[0];

export type AiProviderServiceDependencies = {
	adapters: AiProviderAdapter[];
	cipher: TokenCipher;
	repository: Pick<
		AiProviderRepository,
		| "listEnabledProviders"
		| "findEnabledProvider"
		| "listConnections"
		| "findConnection"
		| "saveConnection"
		| "updateTokens"
		| "clearTokens"
	>;
	users: {
		getOrCreateAppUser(
			identity: AuthenticatedWorkosUser,
		): PromiseLike<{ id: string }>;
	};
};

function parseMetadata(value: string): Record<string, string> {
	try {
		const parsed: unknown = JSON.parse(value);
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			return {};
		}
		return Object.fromEntries(
			Object.entries(parsed).filter(
				(entry): entry is [string, string] => typeof entry[1] === "string",
			),
		);
	} catch {
		return {};
	}
}

function toRegistration(
	connection: AiProviderConnectionRow,
): AiProviderRegistration {
	return {
		clientId: connection.clientId,
		metadata: parseMetadata(connection.registrationMetadata),
	};
}

export function createAiProviderService({
	adapters,
	cipher,
	repository,
	users,
}: AiProviderServiceDependencies) {
	const adaptersById = new Map(
		adapters.map((adapter) => [adapter.id, adapter]),
	);

	async function getAppUser(user: CurrentUserInput) {
		return users.getOrCreateAppUser(resolveCurrentWorkosUser(user));
	}

	/** A provider is usable only if it's enabled in the catalog and has an adapter. */
	async function resolveProvider(
		providerId: string,
	): Promise<{ provider: AiProviderRow; adapter: AiProviderAdapter }> {
		const adapter = adaptersById.get(providerId);
		const provider = adapter
			? await repository.findEnabledProvider(providerId)
			: null;
		if (!adapter || !provider) throw new AiProviderNotFoundError();
		return { provider, adapter };
	}

	async function sealTokens(tokens: AiProviderTokenSet) {
		return {
			accessToken: await cipher.encrypt(tokens.accessToken),
			refreshToken: tokens.refreshToken
				? await cipher.encrypt(tokens.refreshToken)
				: null,
			accessTokenExpiresAt: tokens.expiresAt,
			scopes: tokens.scopes.join(" "),
		};
	}

	async function getAccessToken(
		user: CurrentUserInput,
		providerId: string,
	): Promise<{ accessToken: string; adapter: AiProviderAdapter }> {
		const { provider, adapter } = await resolveProvider(providerId);
		const appUser = await getAppUser(user);
		const connection = await repository.findConnection(appUser.id, providerId);
		const accessToken = connection?.accessToken
			? await cipher.decrypt(connection.accessToken)
			: null;
		if (!connection || !accessToken) {
			throw new AiProviderNotConnectedError(provider.name);
		}

		const expiresAt = connection.accessTokenExpiresAt ?? 0;
		if (expiresAt - REFRESH_LEEWAY_MS > Date.now()) {
			return { accessToken, adapter };
		}

		const refreshToken = connection.refreshToken
			? await cipher.decrypt(connection.refreshToken)
			: null;
		if (!refreshToken) {
			await repository.clearTokens(appUser.id, providerId);
			throw new AiProviderNotConnectedError(provider.name);
		}

		let tokens: AiProviderTokenSet;
		try {
			const refreshed = await adapter.refresh({
				registration: toRegistration(connection),
				refreshToken,
				scopes: connection.scopes.split(" ").filter(Boolean),
			});
			if (
				refreshed.identity &&
				refreshed.identity.subject !== connection.subject
			) {
				throw new AiProviderError(
					"account_mismatch",
					`${provider.name} returned a different account. Reconnect it from your profile.`,
					{ requiresReconnect: true },
				);
			}
			tokens = refreshed.tokens;
		} catch (error) {
			if (error instanceof AiProviderError && error.requiresReconnect) {
				await repository.clearTokens(appUser.id, providerId);
			}
			throw error;
		}

		await repository.updateTokens(
			appUser.id,
			providerId,
			await sealTokens(tokens),
		);
		return { accessToken: tokens.accessToken, adapter };
	}

	return {
		/** Catalog entries the user can connect, with their connection state. */
		async listProviders(
			user: CurrentUserInput,
			getRedirectUri: (providerId: string) => string,
		): Promise<AiProviderStatus[]> {
			const appUser = await getAppUser(user);
			const [providers, connections] = await Promise.all([
				repository.listEnabledProviders(),
				repository.listConnections(appUser.id),
			]);
			const connectionsByProvider = new Map(
				connections.map((connection) => [connection.providerId, connection]),
			);

			return providers.flatMap((provider) => {
				const adapter = adaptersById.get(provider.id);
				if (!adapter) return [];
				const connection = connectionsByProvider.get(provider.id);
				const connected = Boolean(connection?.accessToken);
				return [
					{
						id: provider.id,
						name: provider.name,
						description: provider.description,
						manageUrl: provider.manageUrl,
						canConnect: adapter.canAuthorize(getRedirectUri(provider.id)),
						connected,
						account:
							connected && connection
								? { email: connection.email, name: connection.name }
								: null,
					},
				];
			});
		},

		async startAuthorization(
			user: CurrentUserInput,
			providerId: string,
			{ redirectUri, returnTo }: { redirectUri: string; returnTo: string },
		): Promise<{ flow: AiAuthorizationFlow; url: string }> {
			const identity = resolveCurrentWorkosUser(user);
			const { adapter } = await resolveProvider(providerId);
			const appUser = await users.getOrCreateAppUser(identity);
			const existing = await repository.findConnection(appUser.id, providerId);

			const authorization = await adapter.createAuthorization({
				registration: existing ? toRegistration(existing) : null,
				redirectUri,
				loginHint: existing?.email ?? null,
			});

			return {
				url: authorization.url,
				flow: {
					providerId,
					state: authorization.state,
					workosUserId: identity.workosUserId,
					redirectUri,
					returnTo,
					pending: authorization.pending,
				},
			};
		},

		async completeAuthorization(
			user: CurrentUserInput,
			flow: AiAuthorizationFlow,
			callback: URLSearchParams,
		): Promise<void> {
			const identity = resolveCurrentWorkosUser(user);
			if (identity.workosUserId !== flow.workosUserId) {
				throw new AiProviderError(
					"session_mismatch",
					"You're signed in to HackerFeed as someone else. Try connecting again.",
				);
			}

			const { adapter } = await resolveProvider(flow.providerId);
			const result = await adapter.completeAuthorization({
				callback,
				pending: flow.pending,
				redirectUri: flow.redirectUri,
			});

			const appUser = await users.getOrCreateAppUser(identity);
			await repository.saveConnection(appUser.id, flow.providerId, {
				clientId: result.registration.clientId,
				registrationMetadata: JSON.stringify(result.registration.metadata),
				subject: result.identity.subject,
				email: result.identity.email,
				name: result.identity.name,
				...(await sealTokens(result.tokens)),
			});
		},

		async disconnect(user: CurrentUserInput, providerId: string) {
			const { adapter } = await resolveProvider(providerId);
			const appUser = await getAppUser(user);
			const connection = await repository.findConnection(
				appUser.id,
				providerId,
			);
			if (!connection?.accessToken) return;

			const refreshToken = connection.refreshToken
				? await cipher.decrypt(connection.refreshToken)
				: null;
			await repository.clearTokens(appUser.id, providerId);
			if (refreshToken) {
				await adapter
					.revoke({ registration: toRegistration(connection), refreshToken })
					.catch(() => undefined);
			}
		},

		async listModels(user: CurrentUserInput, providerId: string) {
			const { accessToken, adapter } = await getAccessToken(user, providerId);
			return adapter.listModels(accessToken);
		},

		/** Resolves credentials up front so auth errors surface before streaming. */
		async startChat(
			user: CurrentUserInput,
			providerId: string,
			input: AiChatInput,
		): Promise<AsyncGenerator<string>> {
			const { accessToken, adapter } = await getAccessToken(user, providerId);
			return adapter.streamReply(accessToken, input);
		},
	};
}

export type AiProviderService = ReturnType<typeof createAiProviderService>;
