import { createFileRoute } from "@tanstack/react-router";
import { createAuthCallbackResponse } from "#/server/auth/session";

export const Route = createFileRoute("/auth/callback")({
	server: {
		handlers: {
			GET: ({ request }) => createAuthCallbackResponse(request),
		},
	},
	component: AuthCallback,
});

function AuthCallback() {
	return (
		<div className="flex min-h-[60vh] items-center justify-center">
			<div className="h-8 w-8 animate-spin rounded-full border-2 border-(--chip-line) border-t-(--lagoon)" />
		</div>
	);
}
