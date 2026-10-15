import { createFileRoute } from "@tanstack/react-router";
import { chatGptHttpHandlers } from "#/server/chatgpt/runtime";

export const Route = createFileRoute("/chatgpt/callback")({
	server: {
		handlers: {
			GET: ({ request }) => chatGptHttpHandlers.callback(request),
		},
	},
});
