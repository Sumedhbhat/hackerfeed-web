import { useAuth } from "@workos-inc/authkit-react";
import type { AuthSessionUser } from "#/lib/auth/session-user";

export { signIn, signOut } from "#/lib/auth/authkit";

type AuthSessionState = {
	isLoading: boolean;
	user: AuthSessionUser | null;
};

export function useAuthSession(): AuthSessionState {
	const { isLoading, user } = useAuth();
	return { isLoading, user };
}
