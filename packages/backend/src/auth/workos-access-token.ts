import "@tanstack/react-start/server-only";

import { logger, setLogUser } from "@hackerfeed/runtime/logger";
import type { CryptoKey, JWK, JWTVerifyGetKey, KeyObject } from "jose";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AuthenticatedWorkosUser } from "./current-user";

type JwtVerifyKey = JWTVerifyGetKey | CryptoKey | KeyObject | JWK | Uint8Array;

const DEFAULT_WORKOS_API_HOSTNAME = "api.workos.com";
const remoteJwksByUrl = new Map<string, JWTVerifyGetKey>();

export function getBearerToken(request: Request): string | null {
	const authorization = request.headers.get("Authorization");

	if (!authorization) {
		return null;
	}

	const [scheme, token, ...extraParts] = authorization.trim().split(/\s+/);

	if (scheme !== "Bearer" || !token || extraParts.length > 0) {
		return null;
	}

	return token;
}

function getWorkosAuthOrigin(apiHostname: string | undefined): string {
	const hostname = apiHostname?.trim() || DEFAULT_WORKOS_API_HOSTNAME;
	const url = new URL(
		/^https?:\/\//i.test(hostname) ? hostname : `https://${hostname}`,
	);

	return url.origin;
}

export type WorkosConfig = { apiHostname?: string; clientId: string };

/** The signing keys WorkOS publishes for this app's client id. */
function getJwks({ apiHostname, clientId }: WorkosConfig): JWTVerifyGetKey {
	const origin = getWorkosAuthOrigin(apiHostname);
	const jwksUrl = `${origin}/sso/jwks/${clientId}`;
	let jwks = remoteJwksByUrl.get(jwksUrl);

	if (!jwks) {
		jwks = createRemoteJWKSet(new URL(jwksUrl));
		remoteJwksByUrl.set(jwksUrl, jwks);
	}

	return jwks;
}

/**
 * Verifies an AuthKit access token the same way the WorkOS SDK does: the
 * signature must match the client's JWKS and the token must be unexpired.
 */
export async function verifyWorkosAccessToken(
	token: string,
	key: JwtVerifyKey,
): Promise<AuthenticatedWorkosUser | null> {
	try {
		const { payload } =
			typeof key === "function"
				? await jwtVerify(token, key)
				: await jwtVerify(token, key);

		if (typeof payload.sub !== "string" || payload.sub.trim() === "") {
			return null;
		}

		return { workosUserId: payload.sub };
	} catch (error) {
		// Expired tokens are routine (AuthKit refreshes them); anything else
		// points at a key, client id or clock problem worth seeing in Sentry.
		const code =
			error instanceof Error && "code" in error
				? String(error.code)
				: "unknown";
		if (code !== "ERR_JWT_EXPIRED") {
			logger.warn("Rejected WorkOS access token", { code, error });
		}
		return null;
	}
}

/** Reads the WorkOS user behind a request's `Authorization: Bearer` token. */
export function createRequestAuthenticator(workos: WorkosConfig) {
	return async function getRequestUser(
		request: Request,
	): Promise<AuthenticatedWorkosUser | null> {
		const token = getBearerToken(request);
		if (!token) return null;
		let jwks: JWTVerifyGetKey;
		try {
			jwks = getJwks(workos);
		} catch (error) {
			logger.warn("Rejected WorkOS access token", { code: "config", error });
			return null;
		}
		const user = await verifyWorkosAccessToken(token, jwks);
		if (user) setLogUser(user.workosUserId);
		return user;
	};
}

export type RequestAuthenticator = ReturnType<
	typeof createRequestAuthenticator
>;
