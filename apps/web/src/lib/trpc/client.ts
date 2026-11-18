import {
	type AppRouter,
	createTrpcClient as createApiTrpcClient,
} from "@hackerfeed/api-client/trpc";
import { TRPCClientError, type TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import { env } from "#/env";
import { getApiHeaders } from "#/lib/auth/authkit";

export function createTrpcClient() {
	return createApiTrpcClient({
		apiUrl: env.VITE_API_URL,
		auth: { getHeaders: getApiHeaders },
		link: import.meta.env.VITE_DEMO_DATA === "true" ? demoLink : undefined,
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
