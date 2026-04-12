import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@workos-inc/authkit-react";
import { useEffect } from "react";

export const Route = createFileRoute("/auth/callback")({
	component: AuthCallback,
});

function AuthCallback() {
	const { user, isLoading } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (!isLoading && user) {
			const returnTo = sessionStorage.getItem("auth:returnTo") ?? "/";
			sessionStorage.removeItem("auth:returnTo");
			navigate({ to: returnTo });
		}
	}, [isLoading, user, navigate]);

	return (
		<div className="flex min-h-[60vh] items-center justify-center">
			<div className="h-8 w-8 animate-spin rounded-full border-2 border-(--chip-line) border-t-(--lagoon)" />
		</div>
	);
}
