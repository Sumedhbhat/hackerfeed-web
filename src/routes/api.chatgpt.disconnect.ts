import { createFileRoute } from "@tanstack/react-router";
import { chatGptHttpHandlers } from "#/server/chatgpt/runtime";

export const Route = createFileRoute("/api/chatgpt/disconnect")({
	server: {
		handlers: {
			POST: ({ request }) => chatGptHttpHandlers.disconnect(request),
		},
	},
});
