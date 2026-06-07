import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { Footer } from "../components/footer";
import { Header } from "../components/header";
import { useLocalFavoritesMigration } from "../hooks/useLocalFavoritesMigration";
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
				Try reloading <ArrowRight size={14} aria-hidden="true" />
			</a>
		</main>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		if (import.meta.env.DEV) {
			navigator.serviceWorker
				?.getRegistrations()
				.then((registrations) =>
					Promise.all(
						registrations.map((registration) => registration.unregister()),
					),
				)
				.catch((err) => console.warn("SW cleanup failed:", err));

			window.caches
				?.keys()
				.then((cacheNames) =>
					Promise.all(
						cacheNames
							.filter((cacheName) => cacheName.startsWith("hf-"))
							.map((cacheName) => caches.delete(cacheName)),
					),
				)
				.catch((err) => console.warn("SW cache cleanup failed:", err));

			return;
		}

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
				<TanStackQueryProvider>
					<LocalFavoritesMigration />
					<Header />
					{children}
					<Footer />
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
				<Scripts />
			</body>
		</html>
	);
}

function LocalFavoritesMigration() {
	useLocalFavoritesMigration();

	return null;
}
