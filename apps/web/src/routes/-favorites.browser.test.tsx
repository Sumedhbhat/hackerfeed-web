import type { SavedPaper } from "@hackerfeed/contracts/paper-favorites";
import type { HackerNewsStoryRecord } from "@hackerfeed/hacker-news/records";
import {
	cleanup,
	fireEvent,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FavoritesPage } from "#/components/pages/FavoritesPage";
import { clearAllFavorites, toggleFavorite } from "#/lib/favorites-store";
import { type FavoritesType, parseFavoritesSearch } from "#/routes/favorites";
import { expectNoAxeViolations } from "#/test/axe";
import { renderWithQueryClient as render } from "#/test/renderWithQueryClient";

const authMock = vi.hoisted(() => ({
	isLoading: false,
	user: null as { id: string } | null,
}));

const trpcMock = vi.hoisted(() => ({
	add: vi.fn(),
	clear: vi.fn(),
	list: vi.fn(),
	remove: vi.fn(),
	paperAdd: vi.fn(),
	paperClear: vi.fn(),
	paperList: vi.fn(),
	paperRemove: vi.fn(),
}));

vi.mock("#/hooks/useAuthSession", () => ({
	useAuthSession: () => ({
		isLoading: authMock.isLoading,
		user: authMock.user,
	}),
}));

vi.mock("#/hooks/useFeatureFlags", () => ({ useFeatureFlag: () => false }));

vi.mock("#/lib/trpc/client", () => ({
	createTrpcClient: vi.fn(() => ({
		favorites: {
			add: { mutate: trpcMock.add },
			clear: { mutate: trpcMock.clear },
			list: { query: trpcMock.list },
			remove: { mutate: trpcMock.remove },
		},
		paperFavorites: {
			add: { mutate: trpcMock.paperAdd },
			clear: { mutate: trpcMock.paperClear },
			list: { query: trpcMock.paperList },
			remove: { mutate: trpcMock.paperRemove },
		},
	})),
}));

vi.mock("@tanstack/react-router", async () => ({
	createLink: (await import("#/test/createLinkMock")).createLinkMock,
	createFileRoute: () => (options: unknown) => options,
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

function makeStory(
	overrides: Partial<HackerNewsStoryRecord> = {},
): HackerNewsStoryRecord {
	return {
		by: "author42",
		descendants: 17,
		id: 12345,
		kids: [],
		score: 210,
		text: null,
		time: Math.floor(Date.now() / 1000) - 3600,
		title: "A Test Story Title",
		type: "story",
		url: "https://example.com/test-article",
		...overrides,
	};
}

beforeEach(() => {
	authMock.isLoading = false;
	authMock.user = null;
	trpcMock.add.mockResolvedValue(undefined);
	trpcMock.clear.mockResolvedValue(undefined);
	trpcMock.list.mockResolvedValue([]);
	trpcMock.remove.mockResolvedValue(undefined);
	trpcMock.paperClear.mockResolvedValue(undefined);
	trpcMock.paperList.mockResolvedValue({ items: [], nextCursor: null });
	trpcMock.paperRemove.mockResolvedValue(undefined);
	localStorage.clear();
	clearAllFavorites();
	vi.clearAllMocks();
});

function savedPaper(overrides: Partial<SavedPaper> = {}): SavedPaper {
	return {
		abstract: null,
		arxivId: "2607.00001",
		authors: ["Ada Lovelace"],
		githubRepo: "https://github.com/example/paper",
		keywords: ["reasoning"],
		paperPublishedAt: "2026-07-10T10:00:00.000Z",
		paperUrl: "https://huggingface.co/papers/2607.00001",
		projectPage: "https://example.com/project",
		savedAt: "2026-07-11T00:00:00.000Z",
		summary: "Canonical summary",
		title: "Saved Reasoning Paper",
		upvotes: 42,
		...overrides,
	};
}

afterEach(() => {
	cleanup();
	authMock.isLoading = false;
	authMock.user = null;
	localStorage.clear();
	clearAllFavorites();
});

describe("favorites route search", () => {
	it("keeps an explicit tab and drops missing or invalid values", () => {
		expect(parseFavoritesSearch({})).toEqual({});
		expect(parseFavoritesSearch({ type: "unknown" })).toEqual({});
		expect(parseFavoritesSearch({ type: "papers" })).toEqual({
			type: "papers",
		});
		expect(parseFavoritesSearch({ type: "stories" })).toEqual({
			type: "stories",
		});
	});
});

describe("FavoritesPage backend source of truth", () => {
	it("renders backend favorites with database count and saved order", async () => {
		authMock.user = { id: "workos-favorites-page-list" };
		trpcMock.list.mockResolvedValue([
			makeStory({ id: 2, title: "Database newest saved", time: 10 }),
			makeStory({ id: 1, title: "Database oldest saved", time: 20 }),
		]);

		render(<FavoritesPage />);

		await waitFor(() => {
			expect(screen.getByText("Database newest saved")).toBeDefined();
		});

		expect(screen.getByText("Database oldest saved")).toBeDefined();
		expect(
			screen
				.getAllByRole("heading", { level: 2 })
				.map((heading) => heading.textContent),
		).toEqual(["Database newest saved", "Database oldest saved"]);
	});

	it("moves focus to the row that takes an unsaved story's place", async () => {
		authMock.user = { id: "workos-favorites-page-focus" };
		trpcMock.list.mockResolvedValue([
			makeStory({ id: 1, title: "First" }),
			makeStory({ id: 2, title: "Second" }),
			makeStory({ id: 3, title: "Third" }),
		]);
		render(<FavoritesPage />);

		const second = await screen.findByRole("button", {
			name: "Saved Second",
			pressed: true,
		});
		second.focus();
		fireEvent.click(second);

		// Focus moves to the next row's first control, its title link.
		await waitFor(() =>
			expect(document.activeElement?.textContent).toBe("Third"),
		);
	});

	it("offers Undo after unsaving, which puts the story back", async () => {
		authMock.user = { id: "workos-favorites-page-undo" };
		trpcMock.list.mockResolvedValue([
			makeStory({ id: 1, title: "Keep" }),
			makeStory({ id: 2, title: "Oops" }),
		]);
		render(<FavoritesPage />);

		fireEvent.click(
			await screen.findByRole("button", { name: "Saved Oops", pressed: true }),
		);
		const undo = await screen.findByRole("button", {
			name: "Undo",
		});
		fireEvent.click(undo);

		expect(trpcMock.add).toHaveBeenCalledTimes(1);
		expect(trpcMock.add).toHaveBeenCalledWith(
			expect.objectContaining({ id: 2, title: "Oops" }),
		);
		expect(
			await screen.findByRole("button", { name: "Saved Oops", pressed: true }),
		).toBeTruthy();
		await waitFor(() =>
			expect(screen.queryByRole("button", { name: /^Undo/ })).toBeNull(),
		);
	});

	it("puts focus on a paper's Saved button once Undo brings it back", async () => {
		authMock.user = { id: "paper-undo-user" };
		trpcMock.paperList.mockResolvedValue({
			items: [
				savedPaper(),
				savedPaper({ arxivId: "2607.00002", title: "Older Paper" }),
			],
			nextCursor: null,
		});
		// The server takes a moment, so the row returns after Undo is gone.
		trpcMock.paperAdd.mockImplementation(
			() => new Promise((resolve) => setTimeout(resolve, 150)),
		);
		render(<FavoritesPage activeType="papers" />);

		fireEvent.click(
			await screen.findByRole("button", {
				name: "Saved Older Paper",
				pressed: true,
			}),
		);
		const undo = await screen.findByRole("button", { name: /^Undo/ });
		undo.focus();
		fireEvent.click(undo);

		await waitFor(() =>
			expect(document.activeElement).toBe(
				screen.getByRole("button", { name: "Saved Older Paper" }),
			),
		);
	});

	it("has no axe violations with saved stories", async () => {
		authMock.user = { id: "workos-favorites-page-axe" };
		trpcMock.list.mockResolvedValue([
			makeStory({ id: 1, title: "First" }),
			makeStory({ id: 2, title: "Second" }),
		]);
		const { container } = render(<FavoritesPage />);
		await screen.findByRole("button", { name: "Saved First", pressed: true });
		await expectNoAxeViolations(container);
	});

	it("does not render local favorites after backend favorites load", async () => {
		toggleFavorite(makeStory({ id: 10, title: "Local saved story" }));
		authMock.user = { id: "workos-favorites-page-source" };
		trpcMock.list.mockResolvedValue([
			makeStory({ id: 20, title: "Database saved story" }),
		]);

		render(<FavoritesPage />);

		await waitFor(() => {
			expect(screen.getByText("Database saved story")).toBeDefined();
		});

		expect(screen.queryByText("Local saved story")).toBeNull();
		expect(screen.queryByText(/saved in this collection/i)).toBeNull();
	});
});

describe("FavoritesPage paper collection", () => {
	it("filters saved papers by title, author or topic", async () => {
		authMock.user = { id: "paper-search-user" };
		trpcMock.paperList.mockResolvedValue({
			items: [
				savedPaper(),
				savedPaper({
					arxivId: "2607.00002",
					title: "Older Paper",
					authors: ["Grace Hopper"],
					keywords: ["robotics"],
					savedAt: "2026-07-10T00:00:00.000Z",
				}),
			],
			nextCursor: null,
		});
		render(<FavoritesPage activeType="papers" />);
		await screen.findByText("Older Paper");

		for (const search of ["older", "hopper", "robotics"]) {
			fireEvent.change(
				screen.getByRole("searchbox", { name: "Search saved papers" }),
				{ target: { value: search } },
			);
			expect(screen.getByText("Older Paper")).toBeTruthy();
			expect(screen.queryByText("Saved Reasoning Paper")).toBeNull();
		}

		fireEvent.change(
			screen.getByRole("searchbox", { name: "Search saved papers" }),
			{ target: { value: "nothing like this" } },
		);
		expect(screen.getByText(/No saved papers match/)).toBeTruthy();
		expect(
			await screen.findByText(
				"No saved papers match.",
				{ selector: "output" },
				{ timeout: 2000 },
			),
		).toBeTruthy();
	});

	it("renders canonical paper links in newest-saved order and removes with the star", async () => {
		authMock.user = { id: "paper-page-user" };
		trpcMock.paperList.mockResolvedValue({
			items: [
				savedPaper(),
				savedPaper({
					arxivId: "2607.00002",
					title: "Older Paper",
					savedAt: "2026-07-10T00:00:00.000Z",
				}),
			],
			nextCursor: null,
		});
		render(<FavoritesPage activeType="papers" />);

		await screen.findByText("Saved Reasoning Paper");
		const headings = screen.getAllByRole("heading", { level: 2 });
		expect(headings.map((heading) => heading.textContent)).toEqual([
			"Saved Reasoning Paper",
			"Older Paper",
		]);
		expect(
			screen
				.getByRole("link", { name: "Saved Reasoning Paper" })
				.getAttribute("href"),
		).toBe("https://huggingface.co/papers/2607.00001");
		expect(
			screen.getByRole("link", {
				name: /open in chatgpt: saved reasoning paper/i,
			}),
		).toBeTruthy();
		expect(screen.getAllByRole("link", { name: /project/i })).toHaveLength(2);
		expect(screen.getAllByRole("link", { name: /code/i })).toHaveLength(2);

		fireEvent.click(
			screen.getByRole("button", {
				name: "Saved Saved Reasoning Paper",
				pressed: true,
			}),
		);
		await waitFor(() =>
			expect(trpcMock.paperRemove).toHaveBeenCalledWith({
				arxivId: "2607.00001",
			}),
		);
		expect(screen.queryByText("Saved Reasoning Paper")).toBeNull();
		expect(
			await screen.findByText("Removed “Saved Reasoning Paper” from Saved"),
		).toBeTruthy();
	});

	it("clears only papers after confirmation", async () => {
		authMock.user = { id: "paper-clear-user" };
		trpcMock.paperList.mockResolvedValue({
			items: [
				savedPaper(),
				savedPaper({ arxivId: "2607.00002", title: "Older Paper" }),
			],
			nextCursor: null,
		});
		render(<FavoritesPage activeType="papers" />);

		fireEvent.click(
			await screen.findByRole("button", { name: "Clear papers" }),
		);
		const dialog = await screen.findByRole("alertdialog", {
			name: "Clear all saved papers?",
		});
		expect(trpcMock.paperClear).not.toHaveBeenCalled();
		fireEvent.click(within(dialog).getByRole("button", { name: "Clear" }));
		await waitFor(() => expect(trpcMock.paperClear).toHaveBeenCalledTimes(1));
		expect(trpcMock.clear).not.toHaveBeenCalled();
		expect(await screen.findByText("No saved papers yet")).toBeTruthy();
		// Clear is confirmed in a dialog, so its toast has no Undo.
		expect(await screen.findByText("Removed 2 from Saved")).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
	});

	it("shows an initial paper load failure and recovers on refresh", async () => {
		authMock.user = { id: "paper-recovery-user" };
		trpcMock.paperList
			.mockRejectedValueOnce(new Error("load failed"))
			.mockResolvedValueOnce({ items: [savedPaper()], nextCursor: null });
		render(<FavoritesPage activeType="papers" />);

		expect((await screen.findByRole("alert")).textContent).toContain(
			"Could not load saved favorites.",
		);
		expect(screen.queryByText(/no saved papers yet/i)).toBeNull();
		fireEvent.click(
			screen.getByRole("button", { name: "Refresh saved favorites" }),
		);

		expect(await screen.findByText("Saved Reasoning Paper")).toBeTruthy();
		expect(trpcMock.paperList).toHaveBeenCalledTimes(2);
		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("shows saved papers loading, not an empty Saved page, while they load", async () => {
		authMock.user = { id: "favorites-slow-papers" };
		let resolve: (value: unknown) => void = () => undefined;
		trpcMock.paperList.mockReturnValue(
			new Promise((done) => {
				resolve = done;
			}),
		);
		render(<FavoritesPage />);

		expect(await screen.findByText("Loading saved papers...")).toBeTruthy();
		expect(screen.queryByText("No saved stories yet")).toBeNull();

		resolve({ items: [savedPaper()], nextCursor: null });
		expect(await screen.findByText("Saved Reasoning Paper")).toBeTruthy();
	});

	it("shows a failed paper load instead of an empty Saved page", async () => {
		authMock.user = { id: "favorites-failed-papers" };
		trpcMock.paperList.mockRejectedValue(new Error("load failed"));
		render(<FavoritesPage />);

		expect((await screen.findByRole("alert")).textContent).toContain(
			"Could not load saved favorites.",
		);
		expect(screen.queryByText("No saved stories yet")).toBeNull();
	});

	it("opens the papers tab when only papers are saved, and still lets you pick Stories", async () => {
		authMock.user = { id: "favorites-default-tab" };
		trpcMock.paperList.mockResolvedValue({
			items: [savedPaper()],
			nextCursor: null,
		});
		// Mirrors the route: no type in the URL until a tab is chosen.
		function RoutedFavorites() {
			const [type, setType] = useState<FavoritesType | undefined>();
			return <FavoritesPage activeType={type} onTypeChange={setType} />;
		}
		render(<RoutedFavorites />);

		const papers = await screen.findByRole("tab", { name: "Papers 1" });
		await waitFor(() =>
			expect(papers.getAttribute("aria-selected")).toBe("true"),
		);

		const stories = screen.getByRole("tab", { name: "Stories" });
		fireEvent.click(stories);
		await waitFor(() =>
			expect(stories.getAttribute("aria-selected")).toBe("true"),
		);
		expect(screen.getByText("No saved stories yet")).toBeTruthy();
	});

	it("exposes accessible URL-driven tabs", async () => {
		const onTypeChange = vi.fn();
		function UrlDrivenFavorites() {
			const [type, setType] = useState<FavoritesType>("stories");
			return (
				<FavoritesPage
					activeType={type}
					onTypeChange={(next) => {
						onTypeChange(next);
						setType(next);
					}}
				/>
			);
		}
		render(<UrlDrivenFavorites />);
		const stories = screen.getByRole("tab", { name: /^Stories( \d+)?$/ });
		const papers = screen.getByRole("tab", { name: /^Papers( \d+)?$/ });
		expect(stories.getAttribute("aria-selected")).toBe("true");
		expect(stories.getAttribute("tabindex")).toBe("0");
		expect(papers.getAttribute("tabindex")).toBe("-1");
		expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(
			stories.id,
		);
		fireEvent.click(papers);
		expect(onTypeChange).toHaveBeenCalledWith("papers");
		await waitFor(() =>
			expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(
				papers.id,
			),
		);

		const press = async (
			from: HTMLElement,
			key: string,
			to: HTMLElement,
			type: FavoritesType,
		) => {
			fireEvent.keyDown(from, { key });
			await waitFor(() => expect(document.activeElement).toBe(to));
			await waitFor(() => expect(onTypeChange).toHaveBeenLastCalledWith(type));
		};
		papers.focus();
		await press(papers, "Home", stories, "stories");
		await press(stories, "End", papers, "papers");
		await press(papers, "ArrowRight", stories, "stories");
		await press(stories, "ArrowLeft", papers, "papers");
	});
});
