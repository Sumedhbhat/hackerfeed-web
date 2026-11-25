import "@tanstack/react-start/server-only";

import {
	createRequestAuthenticator,
	type WorkosConfig,
} from "./auth/workos-access-token";
import type { DatabaseContext } from "./database/client";
import { evaluateFeatureFlags } from "./feature-flags/service";
import { handleTrpcRequest } from "./trpc/handler";

export type BackendConfig = {
	workos: WorkosConfig;
	database: DatabaseContext;
};

/**
 * The API's request handler. Every request needs a valid WorkOS access token;
 * without one it gets 401 before any route runs.
 */
export function createBackend(config: BackendConfig) {
	const getRequestUser = createRequestAuthenticator(config.workos);

	return async function handleRequest(request: Request): Promise<Response> {
		const user = await getRequestUser(request);
		if (!user) {
			return Response.json(
				{ error: "Unauthorized", message: "Sign in to use HackerFeed." },
				{
					status: 401,
					headers: { "WWW-Authenticate": 'Bearer realm="HackerFeed"' },
				},
			);
		}

		const { pathname } = new URL(request.url);
		if (pathname === "/api/trpc" || pathname.startsWith("/api/trpc/")) {
			return handleTrpcRequest(request, user, config.database);
		}
		if (pathname === "/api/feature-flags" && request.method === "GET") {
			return Response.json(
				{ flags: evaluateFeatureFlags(user) },
				{ headers: { "Cache-Control": "no-store" } },
			);
		}
		return Response.json({ error: "Not Found" }, { status: 404 });
	};
}
