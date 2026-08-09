import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	redirect,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
import { FatalErrorView } from "../components/fatal-error-view";
import { Footer } from "../components/footer";
import { Header } from "../components/header";
import { useLocalFavoritesMigration } from "../hooks/useLocalFavoritesMigration";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import TanStackQueryProvider from "../integrations/tanstack-query/root-provider";
import { logger } from "../lib/logger";
import { getRequiredSessionUser } from "../server/auth/require-session";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	beforeLoad: async ({ location }) => {
		if (isPublicPath(location.pathname)) {
			return;
		}

		const user = await getRequiredSessionUser();

		if (!user) {
			throw redirect({
				to: "/auth/sign-in",
				search: {
					returnTo: location.href,
				},
			});
		}
	},
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
	component: AppLayout,
	errorComponent: RootError,
	shellComponent: RootDocument,
});

function isPublicPath(pathname: string) {
	return (
		pathname === "/auth/sign-in" ||
		pathname === "/auth/callback" ||
		pathname === "/auth/error" ||
		pathname === "/auth/signed-out" ||
		pathname === "/auth/sign-out" ||
		pathname.startsWith("/api/") ||
		pathname.startsWith("/assets/") ||
		pathname === "/favicon.ico" ||
		pathname === "/manifest.json" ||
		pathname === "/robots.txt" ||
		pathname === "/sw.js" ||
		pathname === "/theme-init.js" ||
		pathname === "/logo192.png" ||
		pathname === "/logo512.png"
	);
}

// ---------------------------------------------------------------------------
// RootError — top-level error boundary shown when any loader throws
// ---------------------------------------------------------------------------

function RootError({ error }: { error: unknown }) {
	logger.error("Root error boundary triggered", {
		err: error instanceof Error ? error.message : String(error),
		stack: error instanceof Error ? error.stack : undefined,
	});

	return <FatalErrorView />;
}

function AppLayout() {
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
		<TanStackQueryProvider>
			<div className="app-shell">
				<LocalFavoritesMigration />
				<Header />
				<div className="app-content">
					<Outlet />
				</div>
				<Footer />
			</div>
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
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script src="/theme-init.js" />
				<HeadContent />
			</head>
			<body className="font-sans antialiased wrap-anywhere selection:bg-[rgba(79,184,178,0.24)]">
				{children}
				<Scripts />
			</body>
		</html>
	);
}

function LocalFavoritesMigration() {
	useLocalFavoritesMigration();

	return null;
}
