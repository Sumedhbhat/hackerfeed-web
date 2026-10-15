import { createFileRoute } from "@tanstack/react-router";
import { chatGptHttpHandlers } from "#/server/chatgpt/runtime";

export const Route = createFileRoute("/api/chatgpt/chat")({
	server: {
		handlers: {
			POST: ({ request }) => chatGptHttpHandlers.chat(request),
		},
	},
});
