import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SiteHeader from "./SiteHeader";

const state = vi.hoisted(() => ({
	paperCount: 0,
	storyCount: 0,
	user: null as { id: string } | null,
}));

vi.mock("#/hooks/useAuthSession", () => ({
	useAuthSession: () => ({ isLoading: false, user: state.user }),
}));
vi.mock("#/hooks/useFavorites", () => ({
	useFavorites: () => ({ count: state.storyCount }),
}));
vi.mock("#/hooks/usePaperFavorites", () => ({
	usePaperFavorites: () => ({ count: state.paperCount }),
}));
vi.mock("./ThemeToggle", () => ({ default: () => null }));
vi.mock("./UserMenu", () => ({ default: () => null }));
vi.mock("@tanstack/react-router", async () => ({
	createLink: (await import("#/test/createLinkMock")).createLinkMock,
}));

afterEach(() => {
	cleanup();
	state.paperCount = 0;
	state.storyCount = 0;
	state.user = null;
});

describe("SiteHeader favorites count", () => {
	it("combines story and paper favorites for authenticated users", () => {
		state.user = { id: "header-user" };
		state.storyCount = 2;
		state.paperCount = 3;
		render(<SiteHeader />);
		expect(screen.getByRole("link", { name: "Favorites 5" })).toBeTruthy();
	});

	it("shows only guest story favorites when signed out", () => {
		state.storyCount = 2;
		state.paperCount = 9;
		render(<SiteHeader />);
		expect(screen.getByRole("link", { name: "Favorites 2" })).toBeTruthy();
	});
});
