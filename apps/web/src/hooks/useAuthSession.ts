import { useAuth } from "@workos-inc/authkit-react";
import type { AuthSessionUser } from "#/lib/auth/session-user";

export { signIn, signOut } from "#/lib/auth/authkit";

type AuthSessionState = {
	isLoading: boolean;
	user: AuthSessionUser | null;
};

export const useAuthSession =
	import.meta.env.VITE_DEMO_DATA === "true" ? useDemoSession : useWorkosSession;

function useDemoSession(): AuthSessionState {
	return {
		isLoading: false,
		user: {
			id: "demo-user",
			email: "demo@example.com",
			firstName: "Demo",
			lastName: "Reader",
			profilePictureUrl: null,
		},
	};
}

function useWorkosSession(): AuthSessionState {
	const { isLoading, user } = useAuth();
	return { isLoading, user };
}
