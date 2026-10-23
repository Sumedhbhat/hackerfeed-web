import type { useAuth } from "@workos-inc/authkit-react";

type AuthKit = ReturnType<typeof useAuth>;

/**
 * The live AuthKit client, published by `AuthProvider` so code outside React
 * (tRPC links, fetch helpers, click handlers) can reach it.
 */
let authKit: AuthKit | null = null;

export function setAuthKit(value: AuthKit) {
	authKit = value;
}

/** `Authorization` header for HackerFeed API calls; empty when signed out. */
export async function getAuthHeaders(): Promise<Record<string, string>> {
	if (!authKit?.user) return {};
	try {
		return { Authorization: `Bearer ${await authKit.getAccessToken()}` };
	} catch {
		return {};
	}
}

export function signIn(
	returnTo = `${window.location.pathname}${window.location.search}`,
) {
	void authKit?.signIn({ state: { returnTo } });
}

export function signOut() {
	if (import.meta.env.VITE_DEMO_DATA === "true") {
		window.location.reload();
		return;
	}
	const returnTo = `${window.location.origin}/auth/signed-out`;
	try {
		authKit?.signOut({ returnTo });
	} catch {
		// No live WorkOS session to end; AuthKit already cleared local state.
		window.location.assign(returnTo);
	}
}

/** Same-origin path from AuthKit's round-tripped (untrusted) `state.returnTo`. */
export function toSafeReturnTo(value: unknown): string {
	if (typeof value !== "string") return "/";
	try {
		const url = new URL(value, window.location.origin);
		if (
			url.origin !== window.location.origin ||
			url.pathname.startsWith("//")
		) {
			return "/";
		}
		return `${url.pathname}${url.search}${url.hash}`;
	} catch {
		return "/";
	}
}
