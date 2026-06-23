import { describe, expect, it, vi } from "vitest";
import { createHuggingFacePaperFeedService } from "./feed";
import type { HuggingFacePaperFeedRepository } from "./feed-repository";

function paper(
	overrides: Partial<
		Awaited<ReturnType<HuggingFacePaperFeedRepository["listPapers"]>>[number]
	> = {},
) {
	return {
		rank: 1,
		entryPublishedAt: "2026-06-21T12:00:00.000Z",
		arxivId: "2606.00001",
		title: "Paper",
		summary: "Original abstract",
		aiSummary: "AI summary",
		paperPublishedAt: "2026-06-21T10:00:00.000Z",
		upvotes: 10,
		projectPage: null,
		githubRepo: null,
		authors: ["Ada Lovelace"],
		keywords: ["agents"],
		...overrides,
	};
}

function createRepository(
	editionDate: string | null,
	papers = [paper()],
): HuggingFacePaperFeedRepository {
	return {
		findEditionDate: vi.fn().mockResolvedValue(editionDate),
		listPapers: vi.fn().mockResolvedValue(papers),
	};
}

describe("Hugging Face paper feed service", () => {
	it("serves the latest successful edition selected by the repository", async () => {
		const repository = createRepository("2026-06-20");
		const service = createHuggingFacePaperFeedService(repository);

		await expect(service.getEdition()).resolves.toMatchObject({
			editionDate: "2026-06-20",
			papers: [
				{
					abstract: "Original abstract",
					paperUrl: "https://huggingface.co/papers/2606.00001",
					summary: "AI summary",
				},
			],
		});
		expect(repository.findEditionDate).toHaveBeenCalledWith(undefined);
	});

	it("requests a specific successful edition when a date is selected", async () => {
		const repository = createRepository("2026-06-18");
		const service = createHuggingFacePaperFeedService(repository);

		await service.getEdition("2026-06-18");

		expect(repository.findEditionDate).toHaveBeenCalledWith("2026-06-18");
	});

	it("returns an empty feed when no successful edition exists", async () => {
		const repository = createRepository(null);
		const service = createHuggingFacePaperFeedService(repository);

		await expect(service.getEdition()).resolves.toEqual({
			editionDate: null,
			papers: [],
			popularKeywords: [],
		});
		expect(repository.listPapers).not.toHaveBeenCalled();
	});

	it("ranks keywords by paper count, upvotes, then keyword", async () => {
		const repository = createRepository("2026-06-20", [
			paper({ upvotes: 10, keywords: ["zebra", "agents"] }),
			paper({ rank: 2, upvotes: 5, keywords: ["agents", "beta"] }),
			paper({ rank: 3, upvotes: 5, keywords: ["alpha"] }),
		]);
		const service = createHuggingFacePaperFeedService(repository);

		const result = await service.getEdition();

		expect(result.popularKeywords).toEqual([
			{ keyword: "agents", paperCount: 2, totalUpvotes: 15 },
			{ keyword: "zebra", paperCount: 1, totalUpvotes: 10 },
			{ keyword: "alpha", paperCount: 1, totalUpvotes: 5 },
			{ keyword: "beta", paperCount: 1, totalUpvotes: 5 },
		]);
	});

	it("uses the abstract directly when no distinct AI summary exists", async () => {
		const repository = createRepository("2026-06-20", [
			paper({ aiSummary: null }),
		]);
		const service = createHuggingFacePaperFeedService(repository);

		const result = await service.getEdition();

		expect(result.papers[0]).toMatchObject({
			abstract: null,
			summary: "Original abstract",
		});
	});
});
