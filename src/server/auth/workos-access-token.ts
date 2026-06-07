import "@tanstack/react-start/server-only";

import type { CryptoKey, JWK, JWTVerifyGetKey, KeyObject } from "jose";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AuthenticatedWorkosUser } from "./current-user";

type JwtVerifyStaticKey = CryptoKey | KeyObject | JWK | Uint8Array;
type JwtVerifyKey = JWTVerifyGetKey | JwtVerifyStaticKey;

type WorkosAccessTokenVerificationOptions = {
	jwks?: JwtVerifyKey;
	issuer?: string;
	audience?: string;
};

type DefaultWorkosAccessTokenVerificationOptions = {
	jwks: JwtVerifyKey;
	issuer: string;
	audience?: string;
};

const DEFAULT_WORKOS_API_HOSTNAME = "api.workos.com";
const remoteJwksByUrl = new Map<string, JwtVerifyKey>();

function isJwtVerifyGetKey(key: JwtVerifyKey): key is JWTVerifyGetKey {
	return typeof key === "function";
}

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

async function getDefaultVerificationOptions(): Promise<DefaultWorkosAccessTokenVerificationOptions> {
	const { env } = await import("#/env");
	const origin = getWorkosAuthOrigin(env.VITE_WORKOS_API_HOSTNAME);
	const jwksUrl = `${origin}/sso/jwks/${env.VITE_WORKOS_CLIENT_ID}`;
	let jwks = remoteJwksByUrl.get(jwksUrl);

	if (!jwks) {
		jwks = createRemoteJWKSet(new URL(jwksUrl));
		remoteJwksByUrl.set(jwksUrl, jwks);
	}

	return {
		jwks,
		issuer: `${origin}/`,
		audience: env.WORKOS_JWT_AUDIENCE,
	};
}

export async function verifyWorkosAccessToken(
	token: string,
	options: WorkosAccessTokenVerificationOptions = {},
): Promise<AuthenticatedWorkosUser | null> {
	try {
		let { jwks, issuer, audience } = options;

		if (!jwks || !issuer || !audience) {
			const defaults = await getDefaultVerificationOptions();
			jwks ??= defaults.jwks;
			issuer ??= defaults.issuer;
			audience ??= defaults.audience;
		}

		if (!jwks || !issuer || !audience) {
			return null;
		}

		const verifyOptions = { issuer, audience };
		const { payload } = isJwtVerifyGetKey(jwks)
			? await jwtVerify(token, jwks, verifyOptions)
			: await jwtVerify(token, jwks, verifyOptions);

		if (typeof payload.sub !== "string" || payload.sub.trim() === "") {
			return null;
		}

		return { workosUserId: payload.sub };
	} catch {
		return null;
	}
}
