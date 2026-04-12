import { createFileRoute } from "@tanstack/react-router";
import { useAuthCallback } from "#/hooks/useAuthCallback";

export const Route = createFileRoute("/auth/callback")({
	component: AuthCallback,
});

function AuthCallback() {
	useAuthCallback();

	return (
		<div className="flex min-h-[60vh] items-center justify-center">
			<div className="h-8 w-8 animate-spin rounded-full border-2 border-(--chip-line) border-t-(--lagoon)" />
		</div>
	);
}
