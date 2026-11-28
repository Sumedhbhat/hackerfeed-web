import type { AppRouter } from "@hackerfeed/entity-state";
import { createTRPCClient, httpBatchLink, type TRPCLink } from "@trpc/client";
import superjson from "superjson";
import type { ApiAuth } from "./auth";

export type { AppRouter };

/** A tRPC client for the API at `apiUrl`, or for `link` when one is given. */
export function createTrpcClient({
	apiUrl,
	auth,
	link,
}: {
	apiUrl: string;
	auth: Pick<ApiAuth, "getHeaders">;
	link?: TRPCLink<AppRouter>;
}) {
	return createTRPCClient<AppRouter>({
		links: [
			link ??
				httpBatchLink({
					url: new URL("/api/trpc", apiUrl).href,
					transformer: superjson,
					headers: auth.getHeaders,
				}),
		],
	});
}
