import { createFileRoute } from "@tanstack/react-router";
import { backend } from "#/backend";

export const Route = createFileRoute("/api/trpc/$")({
	server: {
		handlers: {
			GET: ({ request }) => backend.handleTrpcRequest(request),
			POST: ({ request }) => backend.handleTrpcRequest(request),
		},
	},
});
