import { createFileRoute } from "@tanstack/react-router";
import {
	ProfilePage,
	type ProfileSearch,
} from "#/components/pages/ProfilePage";

const SEARCH_TOKEN = /^[a-z0-9_.-]{1,100}$/i;

export function parseProfileSearch(
	search: Record<string, unknown>,
): ProfileSearch {
	const ai =
		search.ai === "connected" || search.ai === "error" ? search.ai : undefined;
	if (!ai) return {};
	const provider =
		typeof search.provider === "string" && SEARCH_TOKEN.test(search.provider)
			? search.provider
			: undefined;
	const reason =
		typeof search.reason === "string" && SEARCH_TOKEN.test(search.reason)
			? search.reason
			: undefined;
	return {
		ai,
		...(provider ? { provider } : {}),
		...(ai === "error" && reason ? { reason } : {}),
	};
}

export const Route = createFileRoute("/profile")({
	validateSearch: parseProfileSearch,
	component: ProfileRoute,
});

function ProfileRoute() {
	const search = Route.useSearch();
	return <ProfilePage search={search} />;
}
