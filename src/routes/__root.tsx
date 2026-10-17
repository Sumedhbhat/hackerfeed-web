import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
	useLocation,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { type ReactNode, useEffect } from "react";
import { FatalErrorView } from "../components/fatal-error-view";
import { Footer } from "../components/footer";
import { Header } from "../components/header";
import { signIn, useAuthSession } from "../hooks/useAuthSession";
import { useErrorReport } from "../hooks/useErrorReport";
import { useFeatureFlags } from "../hooks/useFeatureFlags";
import { useLocalFavoritesMigration } from "../hooks/useLocalFavoritesMigration";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import TanStackQueryProvider from "../integrations/tanstack-query/root-provider";
import { AuthProvider } from "../integrations/workos/provider";
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
	component: AppLayout,
	errorComponent: RootError,
	shellComponent: RootDocument,
});

/** Pages a signed-out visitor can see; everything else asks for sign-in. */
function isPublicPath(pathname: string) {
	return pathname === "/auth/callback" || pathname === "/auth/signed-out";
}

// ---------------------------------------------------------------------------
// RootError — top-level error boundary shown when any loader throws
// ---------------------------------------------------------------------------

function RootError({ error }: { error: unknown }) {
	const traceId = useErrorReport("Root error boundary triggered", error);

	return <FatalErrorView traceId={traceId} />;
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
				.catch((error) => logger.warn("SW cleanup failed", { error }));

			window.caches
				?.keys()
				.then((cacheNames) =>
					Promise.all(
						cacheNames
							.filter((cacheName) => cacheName.startsWith("hf-"))
							.map((cacheName) => caches.delete(cacheName)),
					),
				)
				.catch((error) => logger.warn("SW cache cleanup failed", { error }));

			return;
		}

		if ("serviceWorker" in navigator) {
			navigator.serviceWorker
				.register("/sw.js", { scope: "/" })
				.catch((error) => logger.warn("SW registration failed", { error }));
		}
	}, []);

	return (
		<AuthProvider>
			<TanStackQueryProvider>
				<div className="app-shell">
					<LocalFavoritesMigration />
					<Header />
					<div className="app-content">
						<SessionGate>
							<Outlet />
						</SessionGate>
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
		</AuthProvider>
	);
}

/**
 * Holds every page until the session is known: who the user is (sending
 * signed-out visitors to sign in) and that session's feature flags. Signing in
 * or out changes the session, so the flags are fetched again.
 */
function SessionGate({ children }: { children: ReactNode }) {
	const { pathname } = useLocation();
	const { isLoading, user } = useAuthSession();
	// Settles on failure too, leaving every flag off rather than blocking the app.
	const { isPending: flagsPending } = useFeatureFlags();
	const isPublic = isPublicPath(pathname);

	useEffect(() => {
		if (!isPublic && !isLoading && !user) signIn();
	}, [isPublic, isLoading, user]);

	if (isPublic || (user && !flagsPending)) return children;

	return (
		<div className="flex min-h-[60vh] items-center justify-center">
			<div className="h-8 w-8 animate-spin rounded-full border-2 border-(--chip-line) border-t-(--lagoon)" />
		</div>
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
