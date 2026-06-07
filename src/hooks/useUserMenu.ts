import { useEffect, useRef, useState } from "react";
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
	open: boolean;
	setOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
	containerRef: React.RefObject<HTMLDivElement>;
	user: ReturnType<typeof useAuthSession>["user"];
	isLoading: boolean;
	signOut: () => void;
	initials: string;
	displayName: string;
};

export function useUserMenu(): UseUserMenuReturn {
	const { user, isLoading } = useAuthSession();
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		function handleClickOutside(e: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [open]);

	const initials = user
		? getInitials(user.firstName, user.lastName, user.email)
		: "";
	const displayName = user
		? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
		: "";

	return {
		open,
		setOpen,
		containerRef,
		user,
		isLoading,
		signOut,
		initials,
		displayName,
	};
}
