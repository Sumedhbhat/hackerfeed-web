import { createFileRoute } from "@tanstack/react-router";
import { backend } from "#/backend";

export const Route = createFileRoute("/api/feature-flags")({
	server: {
		handlers: {
			GET: ({ request }) => backend.handleFeatureFlagsRequest(request),
		},
	},
});
