import { describe, expect, it } from "vitest";
import {
	arxivIdSchema,
	editionPaperSchema,
	paperPresentationSchema,
} from "./schemas";

const paper = {
	abstract: "Original abstract",
	arxivId: "2607.00001",
	authors: ["Ada Lovelace"],
	githubRepo: "https://github.com/example/repo",
	keywords: ["agents"],
	paperPublishedAt: "2026-07-01T00:00:00.000Z",
	paperUrl: "https://huggingface.co/papers/2607.00001",
	projectPage: "https://example.com/project",
	summary: "AI summary",
	title: "Canonical paper",
	upvotes: 12,
};

describe("paper schemas", () => {
	it.each([
		"2607.00001",
		"2607.00001v2",
		"hep-th/9901001",
	])("accepts the supported arXiv ID form %s", (arxivId) => {
		expect(arxivIdSchema.safeParse(arxivId).success).toBe(true);
	});

	it("derives edition papers from the common presentation schema", () => {
		expect(paperPresentationSchema.safeParse(paper).success).toBe(true);
		expect(
			editionPaperSchema.safeParse({
				...paper,
				entryPublishedAt: "2026-07-02T00:00:00.000Z",
				rank: 1,
			}).success,
		).toBe(true);
	});

	it("rejects non-HTTPS presentation URLs", () => {
		expect(
			paperPresentationSchema.safeParse({
				...paper,
				projectPage: "http://example.com/project",
			}).success,
		).toBe(false);
	});
});
