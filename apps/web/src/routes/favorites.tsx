import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FavoritesPage } from "#/components/pages/FavoritesPage";

export type FavoritesType = "stories" | "papers";

/** The tab the URL asks for; none means "open whichever tab has items". */
export function parseFavoritesSearch(search: Record<string, unknown>): {
	type?: FavoritesType;
} {
	return search.type === "papers" || search.type === "stories"
		? { type: search.type }
		: {};
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
			activeType={search.type}
			onTypeChange={(type) => void navigate({ search: { type } })}
		/>
	);
}
