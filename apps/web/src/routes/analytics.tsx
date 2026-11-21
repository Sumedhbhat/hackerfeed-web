import { createFileRoute } from "@tanstack/react-router";
import { AnalyticsPage } from "#/components/pages/AnalyticsPage";
import { titleHead } from "#/lib/page-title";

export const Route = createFileRoute("/analytics")({
	head: () => titleHead("Analytics"),
	component: AnalyticsPage,
});
