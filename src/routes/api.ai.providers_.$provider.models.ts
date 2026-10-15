import { createFileRoute } from "@tanstack/react-router";
import { aiHttpHandlers } from "#/server/ai/runtime";

export const Route = createFileRoute("/api/ai/providers_/$provider/models")({
	server: {
		handlers: {
			GET: ({ request, params }) =>
				aiHttpHandlers.models(request, params.provider),
		},
	},
});
