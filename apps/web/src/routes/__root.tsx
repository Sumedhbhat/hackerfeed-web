import { logger } from "@hackerfeed/runtime/logger";
import { Document } from "@hackerfeed/ui/atoms/Document";
import { ToastProvider } from "@hackerfeed/ui/atoms/Toast";
import { AppShell } from "@hackerfeed/ui/molecules/AppShell";
import { FatalErrorView } from "@hackerfeed/ui/molecules/FatalErrorView";
import { LoadingScreen } from "@hackerfeed/ui/molecules/LoadingScreen";
import appCss from "@hackerfeed/ui/styles.css?url";
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
import { ErrorNotifications } from "../components/organisms/layout/ErrorNotifications";
import SiteFooter from "../components/organisms/layout/SiteFooter";
import SiteHeader from "../components/organisms/layout/SiteHeader";
import { signIn, useAuthSession } from "../hooks/useAuthSession";
import { useErrorReport } from "../hooks/useErrorReport";
import { useFeatureFlags } from "../hooks/useFeatureFlags";
import { useLocalFavoritesMigration } from "../hooks/useLocalFavoritesMigration";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import TanStackQueryProvider from "../integrations/tanstack-query/root-provider";
import { AuthProvider } from "../integrations/workos/provider";

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

function RootError({ error }: { error: unknown }) {
	const traceId = useErrorReport("Root error boundary triggered", error);

	return <FatalErrorView traceId={traceId} />;
}

function AppLayout() {
	useEffect(() => {
		if (import.meta.env.DEV || import.meta.env.VITE_DEMO_DATA === "true") {
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
				<ToastProvider>
					<ErrorNotifications />
					{import.meta.env.VITE_DEMO_DATA !== "true" && (
						<LocalFavoritesMigration />
					)}
					<AppShell header={<SiteHeader />} footer={<SiteFooter />}>
						<SessionGate>
							<Outlet />
						</SessionGate>
					</AppShell>
				</ToastProvider>
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

function SessionGate({ children }: { children: ReactNode }) {
	const { pathname } = useLocation();
	const { isLoading, user } = useAuthSession();
	const { isPending: flagsPending } = useFeatureFlags();
	const isPublic = isPublicPath(pathname);

	useEffect(() => {
		if (!isPublic && !isLoading && !user) signIn();
	}, [isPublic, isLoading, user]);

	if (isPublic || (user && !flagsPending)) return children;

	return <LoadingScreen />;
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<Document
			head={
				<>
					<script src="/theme-init.js" />
					<HeadContent />
				</>
			}
		>
			{children}
			<Scripts />
		</Document>
	);
}

function LocalFavoritesMigration() {
	useLocalFavoritesMigration();

	return null;
}
