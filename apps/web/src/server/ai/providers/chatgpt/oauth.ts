import "@tanstack/react-start/server-only";

import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from "jose";
import { AiProviderError, networkError } from "#/server/ai/errors";
import { createCodeChallenge, randomValue } from "#/server/ai/pkce";
import type { AiProviderIdentity, AiProviderTokenSet } from "#/server/ai/types";
import { toChatGptError } from "./errors";

/**
 * Sign in with ChatGPT (OAuth 2.0 authorization code + PKCE + OIDC).
 * https://developers.openai.com/siwc/token-sharing-open-source/sign-in
 */
export const CHATGPT_ISSUER = "https://auth.openai.com";
export const CHATGPT_AUTHORIZE_URL = `${CHATGPT_ISSUER}/api/accounts/authorize`;
export const CHATGPT_TOKEN_URL = `${CHATGPT_ISSUER}/api/accounts/oauth/token`;
export const CHATGPT_JWKS_URL = `${CHATGPT_ISSUER}/.well-known/jwks.json`;
export const CHATGPT_DISCOVERY_URL = `${CHATGPT_ISSUER}/.well-known/openid-configuration`;
export const CHATGPT_RESOURCE = "https://api.openai.com/v1";
export const CHATGPT_PLAN_USAGE_SCOPE = "chatgpt.tokens.use.direct";
export const CHATGPT_SCOPES = `openid profile email offline_access resource.invoke ${CHATGPT_PLAN_USAGE_SCOPE}`;
/** Placeholder client id that asks OpenAI to register a new app on first sign-in. */
export const DYNAMIC_CLIENT_ID = "dynamic_agent_client";
export const CHATGPT_APP_NAME = "HackerFeed";

export type ChatGptOAuthConfig = {
	/** Client id issued by OpenAI for this deployment. Unset = dynamic registration. */
	clientId?: string;
	/** Only for confidential clients; sent with client_secret_basic. */
	clientSecret?: string;
	fetch?: typeof fetch;
	/** Overrides the remote JWKS (used by tests). */
	getSigningKey?: JWTVerifyGetKey;
};

export type ChatGptTokenSet = AiProviderTokenSet & { idToken: string | null };

/**
 * Without an OpenAI-issued client id, OpenAI only allows dynamic registration
 * with an http://127.0.0.1 loopback callback (local development).
 */
export function isLoopbackRedirect(redirectUri: string): boolean {
	const url = new URL(redirectUri);
	return url.protocol === "http:" && url.hostname === "127.0.0.1";
}

export function isValidIssuedClientId(value: string | null): value is string {
	return (
		value !== null &&
		value !== DYNAMIC_CLIENT_ID &&
		/^[a-zA-Z0-9_-]{1,200}$/.test(value)
	);
}

export async function createAuthorizationRequest({
	clientId,
	hostId,
	loginHint,
	redirectUri,
}: {
	/** Configured or previously issued client id; null registers a new app. */
	clientId: string | null;
	hostId: string;
	loginHint?: string | null;
	redirectUri: string;
}) {
	const state = randomValue();
	const nonce = randomValue();
	const codeVerifier = randomValue();
	const url = new URL(CHATGPT_AUTHORIZE_URL);

	url.search = new URLSearchParams({
		client_id: clientId ?? DYNAMIC_CLIENT_ID,
		response_type: "code",
		redirect_uri: redirectUri,
		scope: CHATGPT_SCOPES,
		resource: CHATGPT_RESOURCE,
		state,
		nonce,
		code_challenge_method: "S256",
		code_challenge: await createCodeChallenge(codeVerifier),
		ext_agent_host_id: hostId,
	}).toString();

	if (!clientId) url.searchParams.set("agent_name_hint", CHATGPT_APP_NAME);
	if (loginHint) url.searchParams.set("login_hint", loginHint);

	return { codeVerifier, nonce, state, url: url.toString() };
}

function parseTokenResponse(
	data: Record<string, unknown>,
	fallbackScopes: string[] = [],
): ChatGptTokenSet {
	const scopes =
		typeof data.scope === "string"
			? data.scope.split(/\s+/).filter(Boolean)
			: fallbackScopes;

	if (
		typeof data.access_token !== "string" ||
		!data.access_token ||
		typeof data.token_type !== "string" ||
		data.token_type.toLowerCase() !== "bearer" ||
		typeof data.expires_in !== "number" ||
		!Number.isFinite(data.expires_in) ||
		data.expires_in <= 0 ||
		scopes.length === 0
	) {
		throw new AiProviderError(
			"invalid_token_response",
			"ChatGPT returned incomplete credentials. Try connecting again.",
		);
	}

	return {
		accessToken: data.access_token,
		refreshToken:
			typeof data.refresh_token === "string" && data.refresh_token
				? data.refresh_token
				: null,
		expiresAt: Date.now() + data.expires_in * 1_000,
		scopes,
		idToken:
			typeof data.id_token === "string" && data.id_token ? data.id_token : null,
	};
}

async function tokenRequest(
	body: URLSearchParams,
	config: ChatGptOAuthConfig,
): Promise<Record<string, unknown>> {
	const headers = new Headers({
		accept: "application/json",
		"content-type": "application/x-www-form-urlencoded",
	});
	if (config.clientSecret) {
		const clientId = body.get("client_id") ?? "";
		const credentials = `${encodeURIComponent(clientId)}:${encodeURIComponent(config.clientSecret)}`;
		headers.set("authorization", `Basic ${btoa(credentials)}`);
	}

	let response: Response;
	try {
		response = await (config.fetch ?? fetch)(CHATGPT_TOKEN_URL, {
			method: "POST",
			headers,
			body,
			redirect: "error",
		});
	} catch {
		throw networkError("ChatGPT");
	}

	const data: unknown = await response.json().catch(() => null);
	if (!response.ok) throw toChatGptError(data, response.status);
	if (data === null || typeof data !== "object" || Array.isArray(data)) {
		throw new AiProviderError(
			"invalid_token_response",
			"ChatGPT returned an unexpected response. Try again.",
			{ retryable: true },
		);
	}
	return data as Record<string, unknown>;
}

export async function exchangeAuthorizationCode(
	{
		clientId,
		code,
		codeVerifier,
		redirectUri,
	}: {
		clientId: string;
		code: string;
		codeVerifier: string;
		redirectUri: string;
	},
	config: ChatGptOAuthConfig,
): Promise<ChatGptTokenSet> {
	const data = await tokenRequest(
		new URLSearchParams({
			grant_type: "authorization_code",
			client_id: clientId,
			code,
			code_verifier: codeVerifier,
			redirect_uri: redirectUri,
			resource: CHATGPT_RESOURCE,
		}),
		config,
	);
	const tokens = parseTokenResponse(data);
	if (!tokens.idToken) {
		throw new AiProviderError(
			"invalid_id_token",
			"ChatGPT did not return a verifiable identity. Try connecting again.",
		);
	}
	return tokens;
}

export async function refreshAccessToken(
	{
		clientId,
		refreshToken,
		scopes,
	}: { clientId: string; refreshToken: string; scopes: string[] },
	config: ChatGptOAuthConfig,
): Promise<ChatGptTokenSet> {
	const data = await tokenRequest(
		new URLSearchParams({
			grant_type: "refresh_token",
			client_id: clientId,
			refresh_token: refreshToken,
			resource: CHATGPT_RESOURCE,
		}),
		config,
	);
	// OAuth may omit scope on refresh when the granted scopes are unchanged.
	const tokens = parseTokenResponse(data, scopes);
	// Refresh tokens rotate; keep the old one only if a new one wasn't issued.
	return { ...tokens, refreshToken: tokens.refreshToken ?? refreshToken };
}

let remoteSigningKey: JWTVerifyGetKey | undefined;

export async function verifyIdToken(
	idToken: string,
	{ clientId, nonce }: { clientId: string; nonce?: string },
	config: ChatGptOAuthConfig,
): Promise<AiProviderIdentity> {
	remoteSigningKey ??= createRemoteJWKSet(new URL(CHATGPT_JWKS_URL));
	const getKey = config.getSigningKey ?? remoteSigningKey;

	try {
		const { payload } = await jwtVerify(idToken, getKey, {
			issuer: CHATGPT_ISSUER,
			audience: clientId,
			algorithms: ["RS256"],
			clockTolerance: 5,
			requiredClaims: ["iss", "aud", "exp", "iat", "sub"],
		});
		if (
			typeof payload.sub !== "string" ||
			!payload.sub ||
			(nonce !== undefined && payload.nonce !== nonce) ||
			(payload.azp !== undefined && payload.azp !== clientId)
		) {
			throw new Error("Identity claims did not match");
		}
		return {
			subject: payload.sub,
			email: typeof payload.email === "string" ? payload.email : null,
			name: typeof payload.name === "string" ? payload.name : null,
		};
	} catch {
		throw new AiProviderError(
			"invalid_id_token",
			"Your ChatGPT identity couldn't be verified. Try connecting again.",
		);
	}
}

/** Best-effort revocation; disconnecting locally must not depend on it. */
export async function revokeRefreshToken(
	{ clientId, refreshToken }: { clientId: string; refreshToken: string },
	config: ChatGptOAuthConfig,
): Promise<boolean> {
	const fetchFn = config.fetch ?? fetch;
	try {
		const discovery = await fetchFn(CHATGPT_DISCOVERY_URL, {
			headers: { accept: "application/json" },
			redirect: "error",
		});
		const data = (await discovery.json()) as { revocation_endpoint?: unknown };
		const endpoint = data.revocation_endpoint;
		if (
			typeof endpoint !== "string" ||
			new URL(endpoint).origin !== CHATGPT_ISSUER
		) {
			return false;
		}
		const response = await fetchFn(endpoint, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				token: refreshToken,
				token_type_hint: "refresh_token",
				client_id: clientId,
			}),
			redirect: "error",
		});
		return response.ok;
	} catch {
		return false;
	}
}
