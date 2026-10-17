import { createFileRoute } from "@tanstack/react-router";
import { aiHttpHandlers } from "#/server/ai/runtime";

export const Route = createFileRoute("/ai/$provider/connect")({
	server: {
		handlers: {
			POST: ({ request, params }) =>
				aiHttpHandlers.connect(request, params.provider),
		},
	},
});
