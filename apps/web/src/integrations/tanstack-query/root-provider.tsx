import {
	MutationCache,
	QueryCache,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import type { ReactNode } from "react";
import { type FailedAction, reportError } from "#/lib/errors/report-error";

type ErrorMeta = {
	/** What a failure stopped the user doing; defaults to load / save. */
	errorAction?: FailedAction;
	/** Replaces the generic "Sorry, we couldn't …" message. */
	errorMessage?: string;
	/** Set false when the component shows this error itself. */
	notifyOnError?: boolean;
};

declare module "@tanstack/react-query" {
	interface Register {
		queryMeta: ErrorMeta;
		mutationMeta: ErrorMeta;
	}
}

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
			// A first load that fails is shown by the screen that asked for it;
			// a refetch that fails would otherwise go unnoticed behind stale data.
			onError(error, query) {
				reportError("TanStack Query error", error, {
					action: query.meta?.errorAction ?? "load",
					message: query.meta?.errorMessage,
					notify: query.meta?.notifyOnError ?? query.state.data !== undefined,
					queryKey: JSON.stringify(query.queryKey),
				});
			},
		}),
		mutationCache: new MutationCache({
			onError(error, _variables, _onMutateResult, mutation) {
				reportError("TanStack Query mutation error", error, {
					action: mutation.meta?.errorAction ?? "save",
					message: mutation.meta?.errorMessage,
					notify: mutation.meta?.notifyOnError ?? true,
					mutationKey: JSON.stringify(mutation.options.mutationKey),
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
