import { createFileRoute } from "@tanstack/react-router";
import { backend } from "#/backend";

export const Route = createFileRoute("/api/ai/providers")({
	server: {
		handlers: {
			GET: ({ request }) => backend.ai.providers(request),
		},
	},
});
