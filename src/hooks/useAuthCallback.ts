import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@workos-inc/authkit-react";
import { useEffect, useEffectEvent } from "react";

export function useAuthCallback(): void {
	const { user, isLoading } = useAuth();
	const navigate = useNavigate();

	const onAuthComplete = useEffectEvent(() => {
		const returnTo = sessionStorage.getItem("auth:returnTo") ?? "/";
		sessionStorage.removeItem("auth:returnTo");
		navigate({ to: returnTo });
	});

	useEffect(() => {
		if (!isLoading && user) {
			onAuthComplete();
		}
	}, [isLoading, user]);
}
