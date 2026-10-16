import "@tanstack/react-start/server-only";

import type { CryptoKey, JWK, JWTVerifyGetKey, KeyObject } from "jose";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { logger, setLogUser } from "#/lib/logger";
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

/** The signing keys WorkOS publishes for this app's client id. */
async function getDefaultJwks(): Promise<JWTVerifyGetKey> {
	const { env } = await import("#/env");
	const origin = getWorkosAuthOrigin(env.VITE_WORKOS_API_HOSTNAME);
	const jwksUrl = `${origin}/sso/jwks/${env.VITE_WORKOS_CLIENT_ID}`;
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
	jwks?: JwtVerifyKey,
): Promise<AuthenticatedWorkosUser | null> {
	try {
		const key = jwks ?? (await getDefaultJwks());
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

/** The WorkOS user behind the request's `Authorization: Bearer` token, if any. */
export async function getRequestUser(
	request: Request,
): Promise<AuthenticatedWorkosUser | null> {
	const token = getBearerToken(request);
	const user = token ? await verifyWorkosAccessToken(token) : null;
	if (user) setLogUser(user.workosUserId);
	return user;
}
