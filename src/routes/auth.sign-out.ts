import { createFileRoute } from "@tanstack/react-router";
import { createSignOutResponse } from "#/server/auth/session";

export const Route = createFileRoute("/auth/sign-out")({
	server: {
		handlers: {
			GET: ({ request }) => createSignOutResponse(request),
			POST: ({ request }) => createSignOutResponse(request),
		},
	},
});
