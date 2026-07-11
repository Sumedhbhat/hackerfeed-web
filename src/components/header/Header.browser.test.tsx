import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Header from "./Header";

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
vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		to,
		className,
	}: {
		children: React.ReactNode;
		to: string;
		className?: string;
	}) => (
		<a href={to} className={className}>
			{children}
		</a>
	),
}));

afterEach(() => {
	cleanup();
	state.paperCount = 0;
	state.storyCount = 0;
	state.user = null;
});

describe("Header favorites count", () => {
	it("combines story and paper favorites for authenticated users", () => {
		state.user = { id: "header-user" };
		state.storyCount = 2;
		state.paperCount = 3;
		render(<Header />);
		expect(screen.getByRole("link", { name: "Favorites 5" })).toBeTruthy();
	});

	it("shows only guest story favorites when signed out", () => {
		state.storyCount = 2;
		state.paperCount = 9;
		render(<Header />);
		expect(screen.getByRole("link", { name: "Favorites 2" })).toBeTruthy();
	});
});
