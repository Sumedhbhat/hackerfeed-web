import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@workos-inc/authkit-react";
import { useEffect } from "react";

export function useAuthCallback(): void {
	const { user, isLoading } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (!isLoading && user) {
			const returnTo = sessionStorage.getItem("auth:returnTo") ?? "/";
			sessionStorage.removeItem("auth:returnTo");
			navigate({ to: returnTo });
		}
	}, [isLoading, user, navigate]);
}
