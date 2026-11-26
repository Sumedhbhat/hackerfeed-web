import { describe, expect } from "vitest";
import { projectPaperPresentation } from "../huggingface-papers/paper-presentation";
import { dailyPapersEntry } from "./support/data";
import { ingestEdition } from "./support/seed";
import { INTEGRATION, test } from "./support/test";

describe("which edition a reader sees", () => {
	test(
		"is the latest successful edition",
		INTEGRATION,
		async ({ api, database, huggingFace }) => {
			await ingestEdition({ database, huggingFace }, "2026-06-19", [
				dailyPapersEntry({ arxivId: "2606.00019" }),
			]);
			await ingestEdition({ database, huggingFace }, "2026-06-20", [
				dailyPapersEntry({ arxivId: "2606.00020" }),
			]);

			const edition = await api.as("user_1").papers.edition.query({});

			expect(edition.editionDate).toBe("2026-06-20");
			expect(edition.papers.map((paper) => paper.arxivId)).toEqual([
				"2606.00020",
			]);
		},
	);

	test(
		"is the selected date when the reader picks one",
		INTEGRATION,
		async ({ api, database, huggingFace }) => {
			await ingestEdition({ database, huggingFace }, "2026-06-18", [
				dailyPapersEntry({ arxivId: "2606.00018" }),
			]);
			await ingestEdition({ database, huggingFace }, "2026-06-20");

			const edition = await api
				.as("user_1")
				.papers.edition.query({ editionDate: "2026-06-18" });

			expect(edition.editionDate).toBe("2026-06-18");
			expect(edition.papers.map((paper) => paper.arxivId)).toEqual([
				"2606.00018",
			]);
		},
	);

	test(
		"falls back past a failed nightly run, and never serves the failed date",
		INTEGRATION,
		async ({ api, database, huggingFace }) => {
			await ingestEdition({ database, huggingFace }, "2026-06-20");
			huggingFace.failNext(503, { times: 3 });
			await expect(
				ingestEdition({ database, huggingFace }, "2026-06-21"),
			).rejects.toThrow("failed with 503");
			const reader = api.as("user_1");

			await expect(reader.papers.edition.query({})).resolves.toMatchObject({
				editionDate: "2026-06-20",
			});
			await expect(
				reader.papers.edition.query({ editionDate: "2026-06-21" }),
			).resolves.toEqual({
				editionDate: null,
				papers: [],
				popularKeywords: [],
			});
		},
	);

	test(
		"is empty before any edition was ingested",
		INTEGRATION,
		async ({ api }) => {
			await expect(api.as("user_1").papers.edition.query({})).resolves.toEqual({
				editionDate: null,
				papers: [],
				popularKeywords: [],
			});
		},
	);
});

describe("popular keywords", () => {
	test(
		"rank by paper count, then upvotes, then keyword",
		INTEGRATION,
		async ({ api, database, huggingFace }) => {
			await ingestEdition({ database, huggingFace }, "2026-06-20", [
				dailyPapersEntry({
					arxivId: "2606.00001",
					upvotes: 10,
					keywords: ["Zebra", "Agents"],
				}),
				dailyPapersEntry({
					arxivId: "2606.00002",
					upvotes: 5,
					keywords: ["agents", "beta"],
				}),
				dailyPapersEntry({
					arxivId: "2606.00003",
					upvotes: 5,
					keywords: ["alpha"],
				}),
			]);

			const edition = await api.as("user_1").papers.edition.query({});

			expect(edition.popularKeywords).toEqual([
				{ keyword: "agents", paperCount: 2, totalUpvotes: 15 },
				{ keyword: "zebra", paperCount: 1, totalUpvotes: 10 },
				{ keyword: "alpha", paperCount: 1, totalUpvotes: 5 },
				{ keyword: "beta", paperCount: 1, totalUpvotes: 5 },
			]);
		},
	);
});

describe("how a paper is presented", () => {
	test("shows the AI summary first and keeps the abstract", () => {
		expect(
			projectPaperPresentation({
				aiSummary: "AI summary",
				arxivId: "2607.00001",
				githubRepo: "https://github.com/example/repo",
				projectPage: "https://example.com/project",
				summary: "Original abstract",
			}),
		).toEqual({
			abstract: "Original abstract",
			githubRepo: "https://github.com/example/repo",
			paperUrl: "https://arxiv.org/abs/2607.00001",
			projectPage: "https://example.com/project",
			summary: "AI summary",
		});
	});

	test("uses the abstract as the summary when there is no distinct AI summary", () => {
		for (const aiSummary of [null, "Original abstract"]) {
			expect(
				projectPaperPresentation({
					aiSummary,
					arxivId: "2607.00001",
					githubRepo: null,
					projectPage: null,
					summary: "Original abstract",
				}),
			).toMatchObject({ abstract: null, summary: "Original abstract" });
		}
	});

	test.each([
		["missing", null],
		["malformed", "not a URL"],
		["HTTP", "http://example.com/project"],
		["active content", "javascript:alert(1)"],
	])("drops %s optional links", (_, value) => {
		expect(
			projectPaperPresentation({
				aiSummary: null,
				arxivId: "2607.00001",
				githubRepo: value,
				projectPage: value,
				summary: "Original abstract",
			}),
		).toMatchObject({ githubRepo: null, projectPage: null });
	});

	test(
		"in the feed, with its authors, keywords and safe links",
		INTEGRATION,
		async ({ api, database, huggingFace }) => {
			await ingestEdition({ database, huggingFace }, "2026-06-20", [
				dailyPapersEntry({
					arxivId: "2606.00001",
					title: "Summarised",
					summary: "Original abstract",
					aiSummary: "AI summary",
					authors: ["Ada Lovelace", "Grace Hopper"],
					keywords: ["Agents"],
					githubRepo: "javascript:alert(1)",
					projectPage: "http://example.com/project",
				}),
				dailyPapersEntry({
					arxivId: "2606.00002",
					summary: "Only an abstract",
					aiSummary: null,
					githubRepo: "https://github.com/example/repo",
				}),
			]);

			const { papers } = await api.as("user_1").papers.edition.query({});

			expect(papers).toMatchObject([
				{
					rank: 1,
					arxivId: "2606.00001",
					title: "Summarised",
					abstract: "Original abstract",
					summary: "AI summary",
					authors: ["Ada Lovelace", "Grace Hopper"],
					keywords: ["agents"],
					githubRepo: null,
					projectPage: null,
					paperUrl: "https://arxiv.org/abs/2606.00001",
				},
				{
					rank: 2,
					arxivId: "2606.00002",
					abstract: null,
					summary: "Only an abstract",
					githubRepo: "https://github.com/example/repo",
				},
			]);
		},
	);
});
