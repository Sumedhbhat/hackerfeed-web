import type { AppRouter } from "@hackerfeed/backend/api-types";
import { createTRPCClient, httpBatchLink, type TRPCLink } from "@trpc/client";
import superjson from "superjson";
import type { ApiAuth } from "./auth";

export type { AppRouter };

/** A tRPC client for /api/trpc, or for `link` when one is given. */
export function createTrpcClient({
	auth,
	link,
}: {
	auth: Pick<ApiAuth, "getHeaders">;
	link?: TRPCLink<AppRouter>;
}) {
	return createTRPCClient<AppRouter>({
		links: [
			link ??
				httpBatchLink({
					url: "/api/trpc",
					transformer: superjson,
					headers: auth.getHeaders,
				}),
		],
	});
}
