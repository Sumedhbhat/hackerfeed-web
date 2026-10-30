import { createFileRoute } from "@tanstack/react-router";
import { getRequestUser } from "#/server/auth/workos-access-token";
import { evaluateFeatureFlags } from "#/server/feature-flags/service";

export const Route = createFileRoute("/api/feature-flags")({
	server: {
		handlers: {
			GET: async ({ request }) =>
				Response.json(
					{ flags: evaluateFeatureFlags(await getRequestUser(request)) },
					{ headers: { "Cache-Control": "no-store" } },
				),
		},
	},
});
