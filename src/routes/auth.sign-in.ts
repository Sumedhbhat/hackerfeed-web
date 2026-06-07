import { createFileRoute } from "@tanstack/react-router";
import { createSignInResponse } from "#/server/auth/session";

export const Route = createFileRoute("/auth/sign-in")({
	server: {
		handlers: {
			GET: ({ request }) => createSignInResponse(request),
		},
	},
});
