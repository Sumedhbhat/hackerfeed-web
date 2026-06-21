import { describe, expect, it } from "vitest";
import {
	normalizeKeyword,
	validateHuggingFaceDailyPapersResponse,
} from "./schema";

const validEntry = {
	isAuthorParticipating: true,
	paper: {
		ai_keywords: ["  Large   Language Models ", "Agents"],
		ai_summary: "Short summary",
		ai_summary_model: "example/model",
		authors: [
			{
				_id: "author-1",
				hidden: false,
				name: "Ada Lovelace",
				user: {
					_id: "user-1",
					avatarUrl: "/avatar.png",
					fullname: "Ada Lovelace",
					name: "ada",
					user: "ada",
				},
			},
		],
		discussionId: "discussion-1",
		id: "2606.12345",
		organization: {
			_id: "org-1",
			fullname: "Example Research",
			name: "example-research",
		},
		publishedAt: "2026-06-18T00:00:00.000Z",
		summary: "Abstract",
		title: "Example Paper",
		upvotes: 12,
	},
	publishedAt: "2026-06-19T00:00:00.000Z",
	summary: "Abstract",
	thumbnail: "https://example.com/thumbnail.png",
	title: "Example Paper",
};

describe("normalizeKeyword", () => {
	it("trims, lowercases, and collapses internal whitespace", () => {
		expect(normalizeKeyword("  Large\t Language\n Models  ")).toBe(
			"large language models",
		);
	});
});

describe("validateHuggingFaceDailyPapersResponse", () => {
	it("returns typed ingestion data with ordered relationships", () => {
		const result = validateHuggingFaceDailyPapersResponse([validEntry]);

		expect(result[0]).toMatchObject({
			entryPublishedAt: "2026-06-19T00:00:00.000Z",
			isAuthorParticipating: true,
			paper: {
				arxivId: "2606.12345",
				authors: [{ hfAuthorId: "author-1", position: 1 }],
				keywords: [
					{
						keywordNormalized: "large language models",
						keywordOriginal: "  Large   Language Models ",
						position: 1,
					},
					{
						keywordNormalized: "agents",
						keywordOriginal: "Agents",
						position: 2,
					},
				],
				organization: { hfOrganizationId: "org-1" },
			},
			rank: 1,
		});
	});

	it("rejects malformed payloads", () => {
		expect(() =>
			validateHuggingFaceDailyPapersResponse([
				{ ...validEntry, paper: { ...validEntry.paper, authors: null } },
			]),
		).toThrow();
		expect(() => validateHuggingFaceDailyPapersResponse({})).toThrow();
	});
});
