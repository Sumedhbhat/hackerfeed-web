import { createFileRoute } from "@tanstack/react-router";
import { chatGptHttpHandlers } from "#/server/chatgpt/runtime";

export const Route = createFileRoute("/chatgpt/connect")({
	server: {
		handlers: {
			GET: ({ request }) => chatGptHttpHandlers.connect(request),
		},
	},
});
