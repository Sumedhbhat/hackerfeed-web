import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PaperEdition } from "#/lib/papers/schemas";
import { renderWithQueryClient as render } from "#/test/renderWithQueryClient";
import { PapersFeed } from "./PapersPage";

const authMock = vi.hoisted(() => ({ userId: "papers-page-user" }));
const trpcMock = vi.hoisted(() => ({
	add: vi.fn(),
	list: vi.fn(),
	remove: vi.fn(),
}));

vi.mock("#/hooks/useAuthSession", () => ({
	useAuthSession: () => ({
		isLoading: false,
		user: { id: authMock.userId },
	}),
}));

vi.mock("#/lib/trpc/client", () => ({
	createTrpcClient: () => ({
		paperFavorites: {
			add: { mutate: trpcMock.add },
			list: { query: trpcMock.list },
			remove: { mutate: trpcMock.remove },
		},
	}),
}));

const emptyEdition: PaperEdition = {
	editionDate: "2026-06-22",
	popularKeywords: [],
	papers: [],
};

const edition: PaperEdition = {
	editionDate: "2026-06-21",
	popularKeywords: [
		{ keyword: "reasoning", paperCount: 1, totalUpvotes: 42 },
		{ keyword: "robotics", paperCount: 1, totalUpvotes: 20 },
	],
	papers: [
		{
			abstract: "The original abstract.",
			arxivId: "2606.00001",
			authors: ["Ada Lovelace", "Grace Hopper"],
			entryPublishedAt: "2026-06-21T12:00:00.000Z",
			githubRepo: "https://github.com/example/reasoning",
			keywords: ["reasoning"],
			paperPublishedAt: "2026-06-21T10:00:00.000Z",
			paperUrl: "https://huggingface.co/papers/2606.00001",
			projectPage: null,
			rank: 1,
			summary: "The AI summary.",
			title: "Reasoning Paper",
			upvotes: 42,
		},
		{
			abstract: null,
			arxivId: "2606.00002",
			authors: ["Katherine Johnson"],
			entryPublishedAt: "2026-06-21T11:00:00.000Z",
			githubRepo: null,
			keywords: ["robotics"],
			paperPublishedAt: "2026-06-21T09:00:00.000Z",
			paperUrl: "https://huggingface.co/papers/2606.00002",
			projectPage: null,
			rank: 2,
			summary: "Robot abstract.",
			title: "Robotics Paper",
			upvotes: 20,
		},
	],
};

beforeEach(() => {
	authMock.userId = `papers-page-${crypto.randomUUID()}`;
	trpcMock.add.mockResolvedValue(undefined);
	trpcMock.list.mockResolvedValue({ items: [], nextCursor: null });
	trpcMock.remove.mockResolvedValue(undefined);
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("PapersFeed", () => {
	it("switches from an AI summary to the original abstract", () => {
		render(
			<PapersFeed edition={edition} filters={{}} onFiltersChange={vi.fn()} />,
		);

		fireEvent.click(screen.getByRole("button", { name: "Show abstract" }));

		expect(screen.getByText("The original abstract.")).toBeTruthy();
		expect(
			screen.getByRole("button", { name: "Show AI summary" }),
		).toBeTruthy();
	});

	it("filters papers by search text without rendering rank labels", () => {
		render(
			<PapersFeed
				edition={edition}
				filters={{ query: "robotics" }}
				onFiltersChange={vi.fn()}
			/>,
		);

		expect(
			screen.getByRole("heading", { name: "Robotics Paper" }),
		).toBeTruthy();
		expect(
			screen.queryByRole("heading", { name: "Reasoning Paper" }),
		).toBeNull();
		expect(screen.queryByText("01")).toBeNull();
	});

	it("links paper titles directly to the paper URL", () => {
		render(
			<PapersFeed edition={edition} filters={{}} onFiltersChange={vi.fn()} />,
		);

		const titleLink = screen.getByRole("link", { name: "Reasoning Paper" });

		expect(titleLink.getAttribute("href")).toBe(
			"https://huggingface.co/papers/2606.00001",
		);
		expect(titleLink.getAttribute("target")).toBe("_blank");
		expect(screen.queryByRole("link", { name: /^Paper$/ })).toBeNull();
	});

	it("renders and toggles a compact paper favorite action without changing links", async () => {
		render(
			<PapersFeed edition={edition} filters={{}} onFiltersChange={vi.fn()} />,
		);

		const save = screen.getByRole("button", {
			name: "Save Reasoning Paper to favorites",
		});
		expect(save.getAttribute("aria-pressed")).toBe("false");
		fireEvent.click(save);

		const remove = await screen.findByRole("button", {
			name: "Remove Reasoning Paper from favorites",
		});
		expect(remove.getAttribute("aria-pressed")).toBe("true");
		expect(trpcMock.add).toHaveBeenCalledWith({ arxivId: "2606.00001" });
		expect(screen.getByRole("link", { name: "Reasoning Paper" })).toBeTruthy();
		expect(
			screen.getByRole("link", { name: "Discuss Reasoning Paper in ChatGPT" }),
		).toBeTruthy();
	});

	it("hides favorite controls when signed out", () => {
		authMock.userId = "";
		render(
			<PapersFeed edition={edition} filters={{}} onFiltersChange={vi.fn()} />,
		);

		expect(screen.queryByLabelText(/Reasoning Paper.*favorites/)).toBeNull();
	});

	it("refreshes after a mutation failure without replaying the mutation", async () => {
		trpcMock.add.mockRejectedValueOnce(new Error("offline"));
		render(
			<PapersFeed edition={edition} filters={{}} onFiltersChange={vi.fn()} />,
		);
		fireEvent.click(
			screen.getByRole("button", {
				name: "Save Reasoning Paper to favorites",
			}),
		);

		expect(
			await screen.findByText(
				"Could not update favorite. Refresh saved favorites, then use the star to try again.",
			),
		).toBeTruthy();
		const refresh = screen.getByRole("button", {
			name: "Refresh saved favorites",
		});
		expect(refresh.getAttribute("title")).toBe("Refresh saved favorites");
		fireEvent.click(refresh);

		await screen.findByRole("button", {
			name: "Save Reasoning Paper to favorites",
		});
		expect(trpcMock.list).toHaveBeenCalledTimes(2);
		expect(trpcMock.add).toHaveBeenCalledTimes(1);
	});

	it("opens ChatGPT with paper discussion context", () => {
		render(
			<PapersFeed edition={edition} filters={{}} onFiltersChange={vi.fn()} />,
		);

		const discussLink = screen.getByRole("link", {
			name: "Discuss Reasoning Paper in ChatGPT",
		});
		const chatUrl = new URL(discussLink.getAttribute("href") ?? "");
		const prompt = chatUrl.searchParams.get("q") ?? "";

		expect(chatUrl.origin).toBe("https://chatgpt.com");
		expect(discussLink.getAttribute("target")).toBe("_blank");
		expect(prompt).toContain("I want to discuss this research paper");
		expect(prompt).toContain("Title: Reasoning Paper");
		expect(prompt).toContain(
			"Paper URL: https://huggingface.co/papers/2606.00001",
		);
		expect(prompt).toContain("Code: https://github.com/example/reasoning");
		expect(prompt).toContain(
			"Please help me understand the core idea, why it matters, and where its useful.",
		);
		expect(prompt).toContain(
			"I will be asking you a huge series of questions about this paper and want them answered.",
		);
		expect(prompt).not.toContain("Summary: The AI summary.");
		expect(prompt).not.toContain("Abstract: The original abstract.");
	});

	it("changes the selected edition date", () => {
		const onFiltersChange = vi.fn();
		render(
			<PapersFeed
				edition={edition}
				filters={{}}
				onFiltersChange={onFiltersChange}
			/>,
		);

		fireEvent.change(screen.getByLabelText("Choose edition date"), {
			target: { value: "2026-06-18" },
		});

		expect(onFiltersChange).toHaveBeenCalledWith({
			date: "2026-06-18",
			topic: undefined,
		});
	});

	it("keeps the edition date picker active when an edition has no papers", () => {
		const onFiltersChange = vi.fn();
		render(
			<PapersFeed
				edition={emptyEdition}
				filters={{}}
				onFiltersChange={onFiltersChange}
			/>,
		);

		expect(
			screen.getByText("No papers are available for this edition."),
		).toBeTruthy();

		fireEvent.change(screen.getByLabelText("Choose edition date"), {
			target: { value: "2026-06-18" },
		});

		expect(onFiltersChange).toHaveBeenCalledWith({
			date: "2026-06-18",
			topic: undefined,
		});
	});
});
