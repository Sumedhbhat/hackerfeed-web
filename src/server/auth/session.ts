import "@tanstack/react-start/server-only";

import { WorkOS } from "@workos-inc/node";
import { env } from "#/env";
import type { AuthSessionUser } from "#/lib/auth/session-user";
import type { AuthenticatedWorkosUser } from "./current-user";

const SESSION_COOKIE = "hackerfeed_session";
const AUTH_FLOW_COOKIE = "hackerfeed_auth_flow";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const AUTH_FLOW_MAX_AGE_SECONDS = 60 * 10;

type AuthFlowCookie = {
	codeVerifier: string;
	returnTo: string;
	state: string;
};

type CurrentSession =
	| {
			user: AuthenticatedWorkosUser;
			sessionUser: AuthSessionUser;
			setCookie?: string;
	  }
	| {
			user: null;
			sessionUser: null;
			setCookie?: string;
	  };

const workos = new WorkOS({
	apiKey: env.WORKOS_API_KEY,
	apiHostname: env.VITE_WORKOS_API_HOSTNAME,
	clientId: env.VITE_WORKOS_CLIENT_ID,
});

function parseCookieHeader(header: string | null): Map<string, string> {
	const cookies = new Map<string, string>();

	if (!header) {
		return cookies;
	}

	for (const part of header.split(";")) {
		const [rawName, ...rawValue] = part.trim().split("=");
		if (!rawName || rawValue.length === 0) {
			continue;
		}

		cookies.set(rawName, rawValue.join("="));
	}

	return cookies;
}

function getRequestCookie(request: Request, name: string): string | null {
	return parseCookieHeader(request.headers.get("Cookie")).get(name) ?? null;
}

function serializeCookie(
	name: string,
	value: string,
	{
		maxAge,
		request,
	}: {
		maxAge: number;
		request: Request;
	},
): string {
	const isSecure = new URL(request.url).protocol === "https:";
	const parts = [
		`${name}=${value}`,
		"Path=/",
		"HttpOnly",
		"SameSite=Lax",
		`Max-Age=${maxAge}`,
	];

	if (isSecure) {
		parts.push("Secure");
	}

	return parts.join("; ");
}

function clearCookie(name: string, request: Request): string {
	return serializeCookie(name, "", { maxAge: 0, request });
}

function encodeJsonCookie(value: unknown): string {
	return encodeURIComponent(JSON.stringify(value));
}

function decodeJsonCookie<T>(value: string | null): T | null {
	if (!value) {
		return null;
	}

	try {
		return JSON.parse(decodeURIComponent(value)) as T;
	} catch {
		return null;
	}
}

function getOrigin(request: Request): string {
	const configuredUrl = env.SERVER_URL?.trim();

	if (configuredUrl) {
		return new URL(configuredUrl).origin;
	}

	return new URL(request.url).origin;
}

function getRedirectUri(request: Request): string {
	return `${getOrigin(request)}/auth/callback`;
}

function normalizeReturnTo(value: string | null): string {
	if (!value || !value.startsWith("/") || value.startsWith("//")) {
		return "/";
	}

	return value;
}

function toSessionUser(user: {
	id: string;
	email: string;
	firstName?: string | null;
	lastName?: string | null;
	profilePictureUrl?: string | null;
	imageUrl?: string | null;
	avatarUrl?: string | null;
	picture?: string | null;
}): AuthSessionUser {
	return {
		id: user.id,
		email: user.email,
		firstName: user.firstName ?? null,
		lastName: user.lastName ?? null,
		profilePictureUrl:
			user.profilePictureUrl ??
			user.imageUrl ??
			user.avatarUrl ??
			user.picture ??
			null,
	};
}

function setSessionCookie(sealedSession: string, request: Request): string {
	return serializeCookie(SESSION_COOKIE, encodeURIComponent(sealedSession), {
		maxAge: SESSION_MAX_AGE_SECONDS,
		request,
	});
}

export async function createSignInResponse(
	request: Request,
): Promise<Response> {
	const url = new URL(request.url);
	const returnTo = normalizeReturnTo(url.searchParams.get("returnTo"));
	const authorization = await workos.userManagement.getAuthorizationUrlWithPKCE(
		{
			clientId: env.VITE_WORKOS_CLIENT_ID,
			provider: "authkit",
			redirectUri: getRedirectUri(request),
		},
	);
	const flow: AuthFlowCookie = {
		codeVerifier: authorization.codeVerifier,
		returnTo,
		state: authorization.state,
	};
	const headers = new Headers({
		Location: authorization.url,
	});

	headers.append(
		"Set-Cookie",
		serializeCookie(AUTH_FLOW_COOKIE, encodeJsonCookie(flow), {
			maxAge: AUTH_FLOW_MAX_AGE_SECONDS,
			request,
		}),
	);

	return new Response(null, { headers, status: 302 });
}

export async function createAuthCallbackResponse(
	request: Request,
): Promise<Response> {
	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const flow = decodeJsonCookie<AuthFlowCookie>(
		getRequestCookie(request, AUTH_FLOW_COOKIE),
	);
	const headers = new Headers();

	headers.append("Set-Cookie", clearCookie(AUTH_FLOW_COOKIE, request));

	if (!code || !state || !flow || flow.state !== state) {
		headers.set("Location", "/auth/sign-in");
		return new Response(null, { headers, status: 302 });
	}

	const auth = await workos.userManagement.authenticateWithCode({
		clientId: env.VITE_WORKOS_CLIENT_ID,
		code,
		codeVerifier: flow.codeVerifier,
		session: {
			cookiePassword: env.WORKOS_COOKIE_PASSWORD,
			sealSession: true,
		},
	});

	if (!auth.sealedSession) {
		headers.set("Location", "/auth/sign-in");
		return new Response(null, { headers, status: 302 });
	}

	headers.append("Set-Cookie", setSessionCookie(auth.sealedSession, request));
	headers.set("Location", normalizeReturnTo(flow.returnTo));

	return new Response(null, { headers, status: 302 });
}

export async function getCurrentSession(
	request: Request,
): Promise<CurrentSession> {
	const sealedSession = getRequestCookie(request, SESSION_COOKIE);

	if (!sealedSession) {
		return { sessionUser: null, user: null };
	}

	const session = workos.userManagement.loadSealedSession({
		cookiePassword: env.WORKOS_COOKIE_PASSWORD,
		sessionData: decodeURIComponent(sealedSession),
	});
	const auth = await session.authenticate();

	if (auth.authenticated) {
		return {
			sessionUser: toSessionUser(auth.user),
			user: { workosUserId: auth.user.id },
		};
	}

	if (auth.reason === "invalid_jwt") {
		const refreshed = await session.refresh();

		if (refreshed.authenticated && refreshed.sealedSession) {
			return {
				sessionUser: toSessionUser(refreshed.user),
				setCookie: setSessionCookie(refreshed.sealedSession, request),
				user: { workosUserId: refreshed.user.id },
			};
		}
	}

	return {
		sessionUser: null,
		setCookie: clearCookie(SESSION_COOKIE, request),
		user: null,
	};
}

export async function createSessionJsonResponse(
	request: Request,
): Promise<Response> {
	const session = await getCurrentSession(request);
	const headers = new Headers({
		"Content-Type": "application/json",
	});

	if (session.setCookie) {
		headers.append("Set-Cookie", session.setCookie);
	}

	return new Response(JSON.stringify({ user: session.sessionUser }), {
		headers,
	});
}

export async function createSignOutResponse(
	request: Request,
): Promise<Response> {
	const sealedSession = getRequestCookie(request, SESSION_COOKIE);
	const headers = new Headers();

	headers.append("Set-Cookie", clearCookie(SESSION_COOKIE, request));

	if (sealedSession) {
		try {
			const session = workos.userManagement.loadSealedSession({
				cookiePassword: env.WORKOS_COOKIE_PASSWORD,
				sessionData: decodeURIComponent(sealedSession),
			});
			headers.set(
				"Location",
				await session.getLogoutUrl({ returnTo: getOrigin(request) }),
			);

			return new Response(null, { headers, status: 302 });
		} catch {
			// If the local cookie is already invalid, clearing it is enough.
		}
	}

	headers.set("Location", "/");

	return new Response(null, { headers, status: 302 });
}
