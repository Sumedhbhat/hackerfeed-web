import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-react";
import { useEffect } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { env } from "../env";
import { useUser } from "../hooks/useUser";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import TanStackQueryProvider from "../integrations/tanstack-query/root-provider";
import { logger } from "../lib/logger";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "HackerFeed",
			},
			{
				name: "description",
				content:
					"A fast Hacker News reader for top, new, and best stories with favorites and mobile-friendly reading flows.",
			},
			{
				name: "theme-color",
				content: "#f3faf5",
			},
			{
				name: "apple-mobile-web-app-capable",
				content: "yes",
			},
			{
				name: "apple-mobile-web-app-status-bar-style",
				content: "black-translucent",
			},
			{
				name: "apple-mobile-web-app-title",
				content: "HackerFeed",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "manifest",
				href: "/manifest.json",
			},
			{
				rel: "apple-touch-icon",
				href: "/logo192.png",
			},
		],
	}),
	errorComponent: RootError,
	shellComponent: RootDocument,
});

// ---------------------------------------------------------------------------
// RootError — top-level error boundary shown when any loader throws
// ---------------------------------------------------------------------------

function RootError({ error }: { error: unknown }) {
	const message =
		error instanceof Error ? error.message : "An unexpected error occurred.";

	logger.error("Root error boundary triggered", {
		err: message,
		stack: error instanceof Error ? error.stack : undefined,
	});

	return (
		<main
			style={{
				fontFamily: "sans-serif",
				padding: "2rem",
				maxWidth: "36rem",
				margin: "0 auto",
			}}
		>
			<p
				style={{
					fontSize: "0.7rem",
					fontWeight: 700,
					letterSpacing: "0.1em",
					textTransform: "uppercase",
					opacity: 0.5,
					marginBottom: "0.75rem",
				}}
			>
				Something went wrong
			</p>
			<h1
				style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.75rem" }}
			>
				HackerFeed couldn&apos;t load.
			</h1>
			<p style={{ fontSize: "0.875rem", opacity: 0.7, margin: "0 0 1.5rem" }}>
				{message}
			</p>
			<a
				href="/"
				style={{ fontSize: "0.875rem", fontWeight: 500, color: "inherit" }}
			>
				Try reloading &rarr;
			</a>
		</main>
	);
}

function AuthGuard({ children }: { children: React.ReactNode }) {
	const user = useUser();
	const { isLoading } = useAuth();

	if (isLoading) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-2 border-(--chip-line) border-t-(--lagoon)" />
			</div>
		);
	}

	if (!user) {
		return null;
	}

	return <>{children}</>;
}

function RootDocument({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		if ("serviceWorker" in navigator) {
			navigator.serviceWorker
				.register("/sw.js", { scope: "/" })
				.catch((err) => console.warn("SW registration failed:", err));
		}

		function handleUnhandledRejection(event: PromiseRejectionEvent) {
			logger.error("Unhandled promise rejection", {
				err:
					event.reason instanceof Error
						? event.reason.message
						: String(event.reason),
				stack: event.reason instanceof Error ? event.reason.stack : undefined,
			});
		}

		window.addEventListener("unhandledrejection", handleUnhandledRejection);
		return () => {
			window.removeEventListener(
				"unhandledrejection",
				handleUnhandledRejection,
			);
		};
	}, []);

	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script src="/theme-init.js" />
				<HeadContent />
			</head>
			<body className="font-sans antialiased wrap-anywhere selection:bg-[rgba(79,184,178,0.24)]">
				<AuthKitProvider
					clientId={env.VITE_WORKOS_CLIENT_ID}
					apiHostname={env.VITE_WORKOS_API_HOSTNAME}
					redirectUri={env.VITE_WORKOS_REDIRECT_URI}
				>
					<TanStackQueryProvider>
						<AuthGuard>
							<Header />
							{children}
							<Footer />
						</AuthGuard>
						<TanStackDevtools
							config={{
								position: "bottom-right",
							}}
							plugins={[
								{
									name: "Tanstack Router",
									render: <TanStackRouterDevtoolsPanel />,
								},
								TanStackQueryDevtools,
							]}
						/>
					</TanStackQueryProvider>
				</AuthKitProvider>
				<Scripts />
			</body>
		</html>
	);
}
