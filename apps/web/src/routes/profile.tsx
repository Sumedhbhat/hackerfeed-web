import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "#/components/pages/ProfilePage";
import { titleHead } from "#/lib/page-title";

export const Route = createFileRoute("/profile")({
	head: () => titleHead("Profile"),
	component: ProfilePage,
});
