import * as Sentry from "@sentry/react";
import { StartClient } from "@tanstack/react-start/client";
import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

if (sentryDsn) {
	Sentry.init({
		dsn: sentryDsn,
		environment:
			import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
		tracesSampleRate: Number(
			import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? "0.1",
		),
		sendDefaultPii: false,
		integrations: [Sentry.browserTracingIntegration()],
	});
}

function ClientErrorFallback({
	error,
	resetError,
}: {
	error: unknown;
	resetError: () => void;
}) {
	const message =
		error instanceof Error ? error.message : "An unexpected error occurred.";

	return (
		<main
			style={{
				fontFamily: "system-ui, sans-serif",
				margin: "0 auto",
				maxWidth: "36rem",
				padding: "4rem 1.5rem",
			}}
		>
			<p
				style={{
					fontSize: "0.7rem",
					fontWeight: 700,
					letterSpacing: "0.1em",
					margin: "0 0 0.75rem",
					opacity: 0.55,
					textTransform: "uppercase",
				}}
			>
				Client error
			</p>
			<h1 style={{ fontSize: "1.35rem", margin: "0 0 0.75rem" }}>
				HackerFeed could not keep running.
			</h1>
			<p style={{ fontSize: "0.95rem", lineHeight: 1.5, opacity: 0.72 }}>
				{message}
			</p>
			<button
				onClick={resetError}
				style={{
					background: "#12312f",
					border: 0,
					borderRadius: "6px",
					color: "white",
					cursor: "pointer",
					font: "inherit",
					fontSize: "0.9rem",
					fontWeight: 650,
					marginTop: "1rem",
					padding: "0.7rem 0.95rem",
				}}
				type="button"
			>
				Try again
			</button>
		</main>
	);
}

startTransition(() => {
	hydrateRoot(
		document,
		<StrictMode>
			<Sentry.ErrorBoundary fallback={ClientErrorFallback}>
				<StartClient />
			</Sentry.ErrorBoundary>
		</StrictMode>,
	);
});
