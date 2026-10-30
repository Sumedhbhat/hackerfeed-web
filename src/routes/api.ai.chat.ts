import { createFileRoute } from "@tanstack/react-router";
import { backend } from "#/backend";

export const Route = createFileRoute("/api/ai/chat")({
	server: {
		handlers: {
			POST: ({ request }) => backend.ai.chat(request),
		},
	},
});
