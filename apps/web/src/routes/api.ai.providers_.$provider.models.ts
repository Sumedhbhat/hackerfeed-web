import { createFileRoute } from "@tanstack/react-router";
import { backend } from "#/backend";

export const Route = createFileRoute("/api/ai/providers_/$provider/models")({
	server: {
		handlers: {
			GET: ({ request, params }) => backend.ai.models(request, params.provider),
		},
	},
});
