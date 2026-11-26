import "@tanstack/react-start/server-only";

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { AuthenticatedWorkosUser } from "../auth/current-user";
import type { DatabaseContext } from "../database/client";
import { createTrpcContext } from "./context";
import { createAppRouter } from "./router";

const appRouter = createAppRouter();

export function handleTrpcRequest(
	request: Request,
	user: AuthenticatedWorkosUser,
	database: DatabaseContext,
) {
	return fetchRequestHandler({
		req: request,
		endpoint: "/api/trpc",
		router: appRouter,
		createContext: () => createTrpcContext({ database, user }),
	});
}
