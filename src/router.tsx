import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { getContext } from "./integrations/tanstack-query/root-provider";
import { logger } from "./lib/logger";
import { routeTree } from "./routeTree.gen";

function DefaultError({ error }: { error: unknown }) {
	const message =
		error instanceof Error ? error.message : "An unexpected error occurred.";

	logger.error("Route error boundary triggered", {
		err: message,
		stack: error instanceof Error ? (error as Error).stack : undefined,
	});

	return (
		<div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
			<p
				style={{
					fontSize: "0.7rem",
					fontWeight: 700,
					letterSpacing: "0.1em",
					textTransform: "uppercase",
					opacity: 0.5,
					marginBottom: "0.5rem",
				}}
			>
				Page error
			</p>
			<h2
				style={{ margin: "0 0 0.75rem", fontSize: "1.1rem", fontWeight: 600 }}
			>
				This page couldn&apos;t load.
			</h2>
			<p style={{ margin: "0 0 1.25rem", fontSize: "0.875rem", opacity: 0.7 }}>
				{message}
			</p>
			<a href="/" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
				&larr; Back to feed
			</a>
		</div>
	);
}

export function getRouter() {
	const context = getContext();
	const router = createTanStackRouter({
		routeTree,

		context,

		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		defaultErrorComponent: DefaultError,
	});

	setupRouterSsrQueryIntegration({
		router,
		queryClient: context.queryClient,
		wrapQueryClient: false,
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
