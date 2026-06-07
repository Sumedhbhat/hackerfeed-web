import { createFileRoute } from "@tanstack/react-router";
import { createSessionJsonResponse } from "#/server/auth/session";

export const Route = createFileRoute("/api/auth/me")({
	server: {
		handlers: {
			GET: ({ request }) => createSessionJsonResponse(request),
		},
	},
});
