import "@tanstack/react-start/server-only";

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { RequestAuthenticator } from "../auth/workos-access-token";
import { getDatabaseContext } from "../database/client";
import { createTrpcContextFromRequest } from "./context";
import { createAppRouter } from "./router";

const appRouter = createAppRouter();

export function createTrpcHandler(getRequestUser: RequestAuthenticator) {
	return function handleTrpcRequest(request: Request) {
		const database = getDatabaseContext();

		return fetchRequestHandler({
			req: request,
			endpoint: "/api/trpc",
			router: appRouter,
			createContext: () =>
				createTrpcContextFromRequest(request, database, getRequestUser),
		});
	};
}
