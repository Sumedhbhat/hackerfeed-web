import {
	QueryCache,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import type { ReactNode } from "react";
import { logger } from "#/lib/logger";

let context:
	| {
			queryClient: QueryClient;
	  }
	| undefined;

export function getContext() {
	if (context) {
		return context;
	}

	const queryClient = new QueryClient({
		queryCache: new QueryCache({
			onError(error, query) {
				logger.error("TanStack Query error", {
					queryKey: JSON.stringify(query.queryKey),
					err: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
				});
			},
		}),
		defaultOptions: {
			queries: {
				staleTime: 60_000,
			},
		},
	});

	context = { queryClient };

	return context;
}

export default function TanStackQueryProvider({
	children,
}: {
	children: ReactNode;
}) {
	const { queryClient } = getContext();

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
