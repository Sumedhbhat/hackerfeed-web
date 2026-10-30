import { createFileRoute } from "@tanstack/react-router";
import { backend } from "#/backend";

export const Route = createFileRoute("/ai/$provider/callback")({
	server: {
		handlers: {
			GET: ({ request, params }) =>
				backend.ai.callback(request, params.provider),
		},
	},
});
