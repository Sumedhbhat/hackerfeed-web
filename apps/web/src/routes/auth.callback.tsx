import { createFileRoute } from "@tanstack/react-router";
import { AuthCallbackPage } from "#/components/pages/AuthCallbackPage";

export const Route = createFileRoute("/auth/callback")({
	component: AuthCallbackPage,
});
