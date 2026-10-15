import { createFileRoute } from "@tanstack/react-router";
import { aiHttpHandlers } from "#/server/ai/runtime";

export const Route = createFileRoute("/api/ai/providers_/$provider/disconnect")(
	{
		server: {
			handlers: {
				POST: ({ request, params }) =>
					aiHttpHandlers.disconnect(request, params.provider),
			},
		},
	},
);
