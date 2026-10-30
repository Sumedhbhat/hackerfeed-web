import { signOut, useAuthSession } from "./useAuthSession";

function getInitials(
	firstName: string | null,
	lastName: string | null,
	email: string,
): string {
	const first = firstName?.[0] ?? "";
	const last = lastName?.[0] ?? "";
	if (first || last) return `${first}${last}`.toUpperCase();
	return email[0].toUpperCase();
}

export type UseUserMenuReturn = {
	user: ReturnType<typeof useAuthSession>["user"];
	isLoading: boolean;
	signOut: () => void;
	initials: string;
	displayName: string;
};

export function useUserMenu(): UseUserMenuReturn {
	const { user, isLoading } = useAuthSession();

	const initials = user
		? getInitials(user.firstName, user.lastName, user.email)
		: "";
	const displayName = user
		? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
		: "";

	return {
		user,
		isLoading,
		signOut,
		initials,
		displayName,
	};
}
