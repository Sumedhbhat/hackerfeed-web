import { useEffect, useState } from "react";
import type { AuthSessionUser } from "#/lib/auth/session-user";
import { logger } from "#/lib/logger";

type AuthSessionState = {
	isLoading: boolean;
	user: AuthSessionUser | null;
};

let cachedState: AuthSessionState = {
	isLoading: true,
	user: null,
};
let loadPromise: Promise<void> | null = null;
const listeners = new Set<(state: AuthSessionState) => void>();

function setAuthSessionState(nextState: AuthSessionState) {
	cachedState = nextState;
	for (const listener of listeners) {
		listener(cachedState);
	}
}

async function loadAuthSession() {
	try {
		const response = await fetch("/api/auth/me", {
			credentials: "same-origin",
		});

		if (!response.ok) {
			throw new Error(`Session request failed with ${response.status}`);
		}

		const data = (await response.json()) as { user: AuthSessionUser | null };
		setAuthSessionState({ isLoading: false, user: data.user });
	} catch (error) {
		logger.error("Auth session load failed", {
			err: error instanceof Error ? error.message : String(error),
		});
		setAuthSessionState({ isLoading: false, user: null });
	}
}

function ensureAuthSessionLoaded() {
	if (!loadPromise) {
		loadPromise = loadAuthSession();
	}
}

export function signIn(returnTo = window.location.pathname) {
	window.location.assign(
		`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`,
	);
}

export function signOut() {
	window.location.assign("/auth/sign-out");
}

export function useAuthSession(): AuthSessionState {
	const [state, setState] = useState(cachedState);

	useEffect(() => {
		listeners.add(setState);
		ensureAuthSessionLoaded();

		return () => {
			listeners.delete(setState);
		};
	}, []);

	return state;
}
