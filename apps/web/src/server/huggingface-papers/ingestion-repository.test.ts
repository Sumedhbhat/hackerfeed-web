import { describe, expect, it, vi } from "vitest";
import {
	createDatabaseContext,
	type D1DatabaseBinding,
} from "#/server/database/client";
import { createHuggingFaceIngestionRepository } from "./ingestion-repository";
import type { HuggingFaceDailyPaper } from "./schema";

type CapturedStatement = { sql: string; values: unknown[] };

function createDatabase() {
	const batches: CapturedStatement[][] = [];
	const binding = {
		prepare(sql: string) {
			return {
				bind(...values: unknown[]) {
					return {
						sql,
						values,
						run: vi.fn().mockResolvedValue(undefined),
					};
				},
			};
		},
		batch(statements: CapturedStatement[]) {
			batches.push(statements);
			return Promise.resolve([]);
		},
	} as unknown as D1DatabaseBinding;

	return { database: createDatabaseContext(binding), batches };
}

function paper(): HuggingFaceDailyPaper {
	return {
		rank: 1,
		entryPublishedAt: "2026-06-20T12:00:00.000Z",
		isAuthorParticipating: true,
		paper: {
			arxivId: "2606.00001",
			title: "Paper",
			summary: "Summary",
			aiSummary: "AI summary",
			aiSummaryModel: "model",
			paperPublishedAt: "2026-06-20T10:00:00.000Z",
			upvotes: 4,
			discussionId: "discussion",
			projectPage: null,
			githubRepo: null,
			thumbnailUrl: null,
			withdrawnAt: null,
			organization: {
				hfOrganizationId: "org-1",
				name: "Org",
				fullname: null,
			},
			authors: [
				{
					hfAuthorId: "author-1",
					name: "Author",
					hidden: false,
					status: null,
					statusLastChangedAt: null,
					hfUserId: null,
					hfUsername: null,
					hfFullname: null,
					avatarUrl: null,
					position: 1,
				},
			],
			keywords: [
				{
					keywordOriginal: " Large Language Models ",
					keywordNormalized: "large language models",
					position: 1,
				},
			],
		},
	};
}

describe("Hugging Face ingestion repository", () => {
	it("batches idempotent upserts and reconciles only returned paper children", async () => {
		const { database, batches } = createDatabase();
		const repository = createHuggingFaceIngestionRepository(database);

		const counts = await repository.persistEdition(
			"2026-06-20",
			[paper()],
			"2026-06-21T00:00:00.000Z",
		);

		expect(batches).toHaveLength(1);
		const sql = batches[0].map((statement) => statement.sql).join("\n");
		expect(sql).toContain('update "hf_daily_paper_entries"');
		expect(sql).not.toContain('delete from "hf_daily_paper_entries"');
		expect(sql).toContain('on conflict ("hf_papers"."arxivId") do update');
		expect(sql).toContain('on conflict ("hf_authors"."hfAuthorId") do update');
		expect(sql).toContain('delete from "hf_paper_authors"');
		expect(sql).toContain('delete from "hf_paper_keywords"');
		expect(sql).toContain(
			'on conflict ("hf_daily_paper_entries"."editionDate", "hf_daily_paper_entries"."paperId") do update',
		);
		expect(counts).toEqual({
			papers: 1,
			authors: 1,
			organizations: 1,
			dailyEntries: 1,
		});
	});
});
