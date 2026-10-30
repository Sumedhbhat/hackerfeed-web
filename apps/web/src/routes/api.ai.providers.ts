import { createFileRoute } from "@tanstack/react-router";
import { aiHttpHandlers } from "#/server/ai/runtime";

export const Route = createFileRoute("/api/ai/providers")({
	server: {
		handlers: {
			GET: ({ request }) => aiHttpHandlers.providers(request),
		},
	},
});
