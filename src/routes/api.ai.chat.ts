import { createFileRoute } from "@tanstack/react-router";
import { aiHttpHandlers } from "#/server/ai/runtime";

export const Route = createFileRoute("/api/ai/chat")({
	server: {
		handlers: {
			POST: ({ request }) => aiHttpHandlers.chat(request),
		},
	},
});
