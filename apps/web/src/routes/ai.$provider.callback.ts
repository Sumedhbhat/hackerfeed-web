import { createFileRoute } from "@tanstack/react-router";
import { aiHttpHandlers } from "#/server/ai/runtime";

export const Route = createFileRoute("/ai/$provider/callback")({
	server: {
		handlers: {
			GET: ({ request, params }) =>
				aiHttpHandlers.callback(request, params.provider),
		},
	},
});
