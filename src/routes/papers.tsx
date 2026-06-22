import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PapersPage } from "#/components/papers/PapersPage";

type PapersSearch = {
	date?: string;
	query?: string;
	topic?: string;
};

function optionalSearchValue(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

export const Route = createFileRoute("/papers")({
	validateSearch: (search: Record<string, unknown>): PapersSearch => ({
		date: optionalSearchValue(search.date),
		query: optionalSearchValue(search.query),
		topic: optionalSearchValue(search.topic),
	}),
	component: PapersRoute,
});

function PapersRoute() {
	const filters = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });

	return (
		<PapersPage
			filters={filters}
			onFiltersChange={(nextFilters) => {
				void navigate({ search: nextFilters, replace: true });
			}}
		/>
	);
}
