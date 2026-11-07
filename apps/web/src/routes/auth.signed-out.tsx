import { createFileRoute } from "@tanstack/react-router";
import { SignedOutPage } from "#/components/pages/SignedOutPage";
import { titleHead } from "#/lib/page-title";

export const Route = createFileRoute("/auth/signed-out")({
	head: () => titleHead("Signed out"),
	component: SignedOutPage,
});
