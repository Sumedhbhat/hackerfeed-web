import { render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { favoriteStoriesOutputSchema } from "#/lib/favorites/schemas";
import { paperFavoritesListOutputSchema } from "#/lib/paper-favorites/schemas";
import { matchesFilters } from "#/lib/papers/presentation";
import { paperEditionOutputSchema } from "#/lib/papers/schemas";
import { createDemoApi } from "./demo";

vi.mock("@workos-inc/authkit-react", () => ({
	useAuth: () => {
		throw new Error("Demo must not initialize WorkOS");
	},
	AuthKitProvider: () => {
		throw new Error("Demo must not mount WorkOS");
	},
}));
afterEach(() => vi.unstubAllEnvs());

describe("fixture demo", () => {
	it("seeds favorites once across clients, mutates in memory and resets on a new page", async () => {
		vi.stubEnv("VITE_DEMO_DATA", "true");
		const fetch = vi
			.spyOn(globalThis, "fetch")
			.mockRejectedValue(new Error("No backend"));
		const { createTrpcClient } = await import("./client");
		const first = createTrpcClient();
		const seed = await first.favorites.list.query();
		expect(favoriteStoriesOutputSchema.parse(seed)).toHaveLength(3);
		await first.favorites.remove.mutate({ hnStoryId: seed[0].id });
		const second = createTrpcClient();
		expect(await second.favorites.list.query()).toHaveLength(2);
		await second.favorites.add.mutate(seed[0]);
		await second.favorites.add.mutate(seed[0]);
		expect(await first.favorites.list.query()).toHaveLength(3);
		await second.favorites.clear.mutate();
		expect(await first.favorites.list.query()).toEqual([]);
		await second.favorites.importLocal.mutate({ stories: [seed[0], seed[0]] });
		expect(await first.favorites.list.query()).toEqual([seed[0]]);
		await first.views.story.mutate(seed[0]);
		expect(createDemoApi()("favorites.list", undefined)).toHaveLength(3);
		expect(fetch).not.toHaveBeenCalled();
		fetch.mockRestore();
	});

	it("serves dated paper editions, authors, keywords and saved-paper pagination", () => {
		const api = createDemoApi();
		const edition = paperEditionOutputSchema.parse(api("papers.edition", {}));
		expect(edition.papers).toHaveLength(6);
		expect(edition.papers[0].authors).toContain("Ada Placeholder");
		expect(edition.papers[0].keywords).toContain("Sparse Attention");
		expect(
			edition.papers.filter((paper) =>
				matchesFilters(paper, "Ada", "Sparse Attention"),
			),
		).toHaveLength(1);
		expect(
			paperEditionOutputSchema.parse(
				api("papers.edition", { editionDate: "2000-01-01" }),
			).papers,
		).toEqual([]);
		const first = paperFavoritesListOutputSchema.parse(
			api("paperFavorites.list", { limit: 1 }),
		);
		expect(first.nextCursor).toBeTruthy();
		const second = paperFavoritesListOutputSchema.parse(
			api("paperFavorites.list", { limit: 1, cursor: first.nextCursor }),
		);
		expect(second.items[0].arxivId).not.toBe(first.items[0].arxivId);
		expect(second.nextCursor).toBeNull();
		const added = { arxivId: edition.papers[2].arxivId };
		api("paperFavorites.add", added);
		api("paperFavorites.add", added);
		expect(
			paperFavoritesListOutputSchema.parse(api("paperFavorites.list", {}))
				.items,
		).toHaveLength(3);
		api("views.paper", added);
		api("paperFavorites.remove", added);
		expect(
			paperFavoritesListOutputSchema.parse(api("paperFavorites.list", {}))
				.items,
		).toHaveLength(2);
		expect(() => api("paperFavorites.add", { arxivId: "9999.99999" })).toThrow(
			"not found",
		);
		expect(() => api("paperFavorites.list", { cursor: "invalid" })).toThrow(
			"cursor",
		);
		api("paperFavorites.clear", undefined);
		expect(
			paperFavoritesListOutputSchema.parse(api("paperFavorites.list", {}))
				.items,
		).toEqual([]);
	});

	it("provides a fixed profile and local flags without WorkOS or HTTP", async () => {
		vi.stubEnv("VITE_DEMO_DATA", "true");
		const { AuthProvider } = await import("#/integrations/workos/provider");
		const { useAuthSession } = await import("#/hooks/useAuthSession");
		const { fetchFeatureFlags } = await import("#/lib/feature-flags/client");
		render(
			<AuthProvider>
				<span>Demo content</span>
			</AuthProvider>,
		);
		expect(screen.getByText("Demo content")).toBeTruthy();
		expect(renderHook(useAuthSession).result.current).toMatchObject({
			isLoading: false,
			user: { id: "demo-user", email: "demo@example.com" },
		});
		expect(await fetchFeatureFlags()).toEqual({ aiChat: false });
	});
});
