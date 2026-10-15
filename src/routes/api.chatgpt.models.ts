import { createFileRoute } from "@tanstack/react-router";
import { chatGptHttpHandlers } from "#/server/chatgpt/runtime";

export const Route = createFileRoute("/api/chatgpt/models")({
	server: {
		handlers: {
			GET: ({ request }) => chatGptHttpHandlers.models(request),
		},
	},
});
