import { logger, setLogUser } from "@hackerfeed/runtime/logger";
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-react";
import { type ReactNode, useEffect } from "react";
import { env } from "#/env";
import { setAuthKit } from "#/lib/auth/authkit";

/**
 * WorkOS AuthKit owns the whole session. `devMode` keeps the refresh token in
 * localStorage, so sign-in survives reloads and AuthKit refreshes the
 * short-lived access token on its own.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
	if (import.meta.env.VITE_DEMO_DATA === "true") return children;
	return (
		<AuthKitProvider
			clientId={env.VITE_WORKOS_CLIENT_ID}
			apiHostname={env.VITE_WORKOS_API_HOSTNAME}
			redirectUri={env.VITE_WORKOS_REDIRECT_URI}
			devMode
			// Navigating here races AuthKit's own history.replaceState right after
			// this callback, leaving the router on /auth/callback. That route
			// navigates once the user is set instead.
			onRedirectCallback={({ authenticationMethod }) => {
				logger.info("Signed in", { authenticationMethod });
			}}
			onRefreshFailure={() => {
				// AuthKit has dropped the session; AuthGate sends the user to sign in.
				logger.warn("WorkOS session refresh failed");
			}}
		>
			<AuthKitBridge>{children}</AuthKitBridge>
		</AuthKitProvider>
	);
}

function AuthKitBridge({ children }: { children: ReactNode }) {
	const authKit = useAuth();
	// Published during render so children's effects always see the live client.
	setAuthKit(authKit);

	const userId = authKit.user?.id ?? null;
	useEffect(() => setLogUser(userId), [userId]);

	return children;
}
