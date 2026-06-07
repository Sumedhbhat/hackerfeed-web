import "@tanstack/react-start/server-only";

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createTrpcContextFromRequest } from "./context";
import { createAppRouter } from "./router";

const appRouter = createAppRouter();

export function handleTrpcRequest(request: Request) {
	return fetchRequestHandler({
		req: request,
		endpoint: "/api/trpc",
		router: appRouter,
		createContext: () => createTrpcContextFromRequest(request),
	});
}
