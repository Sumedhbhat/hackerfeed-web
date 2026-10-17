import { createFileRoute } from "@tanstack/react-router";
import { SignedOutPage } from "#/components/pages/SignedOutPage";

export const Route = createFileRoute("/auth/signed-out")({
	component: SignedOutPage,
});
