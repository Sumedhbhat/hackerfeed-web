import { createFileRoute } from "@tanstack/react-router";
import { backend } from "#/backend";

export const Route = createFileRoute("/ai/$provider/connect")({
	server: {
		handlers: {
			POST: ({ request, params }) =>
				backend.ai.connect(request, params.provider),
		},
	},
});
