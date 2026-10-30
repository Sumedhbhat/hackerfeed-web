import { createFileRoute } from "@tanstack/react-router";
import { backend } from "#/backend";

export const Route = createFileRoute("/api/ai/providers_/$provider/disconnect")(
	{
		server: {
			handlers: {
				POST: ({ request, params }) =>
					backend.ai.disconnect(request, params.provider),
			},
		},
	},
);
