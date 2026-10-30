import {
	createTRPCClient,
	httpBatchLink,
	TRPCClientError,
	type TRPCLink,
} from "@trpc/client";
import { observable } from "@trpc/server/observable";
import superjson from "superjson";
import { getApiHeaders } from "#/lib/auth/authkit";
import type { AppRouter } from "#/server/trpc/router";

export function createTrpcClient() {
	return createTRPCClient<AppRouter>({
		links: [
			import.meta.env.VITE_DEMO_DATA === "true"
				? demoLink
				: httpBatchLink({
						url: "/api/trpc",
						transformer: superjson,
						headers: getApiHeaders,
					}),
		],
	});
}

// Dynamic import keeps fixtures out of production chunks.
const demoLink: TRPCLink<AppRouter> =
	(runtime) =>
	({ op, next }) => {
		return observable((observer) => {
			let unsubscribe: (() => void) | undefined;
			let cancelled = false;
			void import("./demo")
				.then(({ demoLink }) => {
					if (!cancelled)
						unsubscribe = demoLink(runtime)({ op, next }).subscribe(
							observer,
						).unsubscribe;
				})
				.catch((error) => observer.error(TRPCClientError.from(error)));
			return () => {
				cancelled = true;
				unsubscribe?.();
			};
		});
	};
