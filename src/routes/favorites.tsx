import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FavoritesPage } from "#/components/favorites-page";

export type FavoritesType = "stories" | "papers";

export function parseFavoritesSearch(search: Record<string, unknown>): {
	type?: FavoritesType;
} {
	return search.type === "papers" ? { type: "papers" } : {};
}

export const Route = createFileRoute("/favorites")({
	validateSearch: parseFavoritesSearch,
	component: FavoritesRoute,
});

function FavoritesRoute() {
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });

	return (
		<FavoritesPage
			activeType={search.type ?? "stories"}
			onTypeChange={(type) =>
				void navigate({ search: type === "papers" ? { type } : {} })
			}
		/>
	);
}
