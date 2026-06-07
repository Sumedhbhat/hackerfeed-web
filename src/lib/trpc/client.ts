import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "#/server/trpc/router";

export function createTrpcClient() {
	return createTRPCClient<AppRouter>({
		links: [
			httpBatchLink({
				url: "/api/trpc",
				transformer: superjson,
			}),
		],
	});
}
