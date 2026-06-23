import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PaperEdition } from "#/lib/papers/schemas";
import { PapersFeed } from "./PapersPage";

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

afterEach(cleanup);

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
		expect(prompt).toContain("Summary: The AI summary.");
		expect(prompt).toContain("Abstract: The original abstract.");
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
});
