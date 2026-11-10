import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "#/components/pages/SettingsPage";
import { titleHead } from "#/lib/page-title";

export const Route = createFileRoute("/settings")({
	head: () => titleHead("Settings"),
	component: SettingsPage,
});
