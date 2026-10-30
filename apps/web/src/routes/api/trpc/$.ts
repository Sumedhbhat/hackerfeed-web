import { createFileRoute } from "@tanstack/react-router";
import { handleTrpcRequest } from "#/server/trpc/handler";

export const Route = createFileRoute("/api/trpc/$")({
	server: {
		handlers: {
			GET: ({ request }) => handleTrpcRequest(request),
			POST: ({ request }) => handleTrpcRequest(request),
		},
	},
});
