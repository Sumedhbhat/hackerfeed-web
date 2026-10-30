import "@tanstack/react-start/server-only";

import { eq, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { DatabaseContext } from "#/server/database/client";
import {
	hfAuthors,
	hfDailyPaperEntries,
	hfIngestionRuns,
	hfOrganizations,
	hfPaperAuthors,
	hfPaperKeywords,
	hfPapers,
} from "#/server/database/schema";
import type { HuggingFaceDailyPaper } from "./schema";

export type IngestionCounts = {
	papers: number;
	authors: number;
	organizations: number;
	dailyEntries: number;
};

export type IngestionRun = {
	editionDate: string;
	startedAt: string;
	sourceUrl: string;
};

type DrizzleBatch = [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]];

function entityId(kind: string, externalId: string): string {
	return `${kind}:${externalId}`;
}

export function createHuggingFaceIngestionRepository(
	database: DatabaseContext,
) {
	return {
		async createRun(run: IngestionRun): Promise<string> {
			const [createdRun] = await database
				.insert(hfIngestionRuns)
				.values({
					editionDate: run.editionDate,
					status: "running",
					startedAt: run.startedAt,
					sourceUrl: run.sourceUrl,
					limitValue: 100,
					sortValue: "publishedAt",
					createdAt: run.startedAt,
					updatedAt: run.startedAt,
				})
				.returning({ id: hfIngestionRuns.id });

			if (!createdRun) {
				throw new Error("D1 ingestion run insert failed");
			}
			return createdRun.id;
		},

		async persistEdition(
			editionDate: string,
			entries: HuggingFaceDailyPaper[],
			timestamp: string,
		): Promise<IngestionCounts> {
			const authors = new Set<string>();
			const organizations = new Set<string>();
			const rankOffset = entries.length + 1;
			const writes: DrizzleBatch = [
				database
					.update(hfDailyPaperEntries)
					.set({
						rank: sql`${hfDailyPaperEntries.rank} + (
							SELECT COALESCE(MAX(${hfDailyPaperEntries.rank}), 0) + ${rankOffset}
							FROM ${hfDailyPaperEntries}
							WHERE ${hfDailyPaperEntries.editionDate} = ${editionDate}
						)`,
						updatedAt: timestamp,
					})
					.where(eq(hfDailyPaperEntries.editionDate, editionDate)),
			];

			for (const entry of entries) {
				const paper = entry.paper;
				const paperId = entityId("paper", paper.arxivId);
				const organizationId = paper.organization
					? entityId("organization", paper.organization.hfOrganizationId)
					: null;

				if (paper.organization) {
					const organization = paper.organization;
					organizations.add(organization.hfOrganizationId);
					writes.push(
						database
							.insert(hfOrganizations)
							.values({
								id:
									organizationId ??
									entityId("organization", organization.hfOrganizationId),
								hfOrganizationId: organization.hfOrganizationId,
								name: organization.name,
								fullname: organization.fullname,
								createdAt: timestamp,
								updatedAt: timestamp,
							})
							.onConflictDoUpdate({
								target: hfOrganizations.hfOrganizationId,
								set: {
									name: organization.name,
									fullname: organization.fullname,
									updatedAt: timestamp,
								},
							}),
					);
				}

				const paperValues = {
					organizationId,
					title: paper.title,
					summary: paper.summary,
					aiSummary: paper.aiSummary,
					aiSummaryModel: paper.aiSummaryModel,
					paperPublishedAt: paper.paperPublishedAt,
					upvotes: paper.upvotes,
					discussionId: paper.discussionId,
					projectPage: paper.projectPage,
					githubRepo: paper.githubRepo,
					thumbnailUrl: paper.thumbnailUrl,
					withdrawnAt: paper.withdrawnAt,
					updatedAt: timestamp,
				};
				writes.push(
					database
						.insert(hfPapers)
						.values({
							id: paperId,
							arxivId: paper.arxivId,
							...paperValues,
							createdAt: timestamp,
						})
						.onConflictDoUpdate({
							target: hfPapers.arxivId,
							set: paperValues,
						}),
					database
						.delete(hfPaperAuthors)
						.where(eq(hfPaperAuthors.paperId, paperId)),
					database
						.delete(hfPaperKeywords)
						.where(eq(hfPaperKeywords.paperId, paperId)),
				);

				for (const author of paper.authors) {
					const authorId = entityId("author", author.hfAuthorId);
					authors.add(author.hfAuthorId);
					const authorValues = {
						name: author.name,
						hidden: author.hidden,
						status: author.status,
						statusLastChangedAt: author.statusLastChangedAt,
						hfUserId: author.hfUserId,
						hfUsername: author.hfUsername,
						hfFullname: author.hfFullname,
						avatarUrl: author.avatarUrl,
						updatedAt: timestamp,
					};
					writes.push(
						database
							.insert(hfAuthors)
							.values({
								id: authorId,
								hfAuthorId: author.hfAuthorId,
								...authorValues,
								createdAt: timestamp,
							})
							.onConflictDoUpdate({
								target: hfAuthors.hfAuthorId,
								set: authorValues,
							}),
						database.insert(hfPaperAuthors).values({
							paperId,
							authorId,
							position: author.position,
							createdAt: timestamp,
							updatedAt: timestamp,
						}),
					);
				}

				for (const keyword of paper.keywords) {
					writes.push(
						database.insert(hfPaperKeywords).values({
							paperId,
							keywordOriginal: keyword.keywordOriginal,
							keywordNormalized: keyword.keywordNormalized,
							position: keyword.position,
							createdAt: timestamp,
							updatedAt: timestamp,
						}),
					);
				}

				const entryValues = {
					entryPublishedAt: entry.entryPublishedAt,
					isAuthorParticipating: entry.isAuthorParticipating,
					rank: entry.rank,
					updatedAt: timestamp,
				};
				writes.push(
					database
						.insert(hfDailyPaperEntries)
						.values({
							editionDate,
							paperId,
							...entryValues,
							createdAt: timestamp,
						})
						.onConflictDoUpdate({
							target: [
								hfDailyPaperEntries.editionDate,
								hfDailyPaperEntries.paperId,
							],
							set: entryValues,
						}),
				);
			}

			await database.batch(writes);
			return {
				papers: entries.length,
				authors: authors.size,
				organizations: organizations.size,
				dailyEntries: entries.length,
			};
		},

		async finishRunSuccess(
			runId: string,
			finishedAt: string,
			fetchedCount: number,
			counts: IngestionCounts,
		): Promise<void> {
			await database
				.update(hfIngestionRuns)
				.set({
					status: "success",
					finishedAt,
					fetchedCount,
					upsertedPaperCount: counts.papers,
					upsertedAuthorCount: counts.authors,
					upsertedOrganizationCount: counts.organizations,
					upsertedDailyEntryCount: counts.dailyEntries,
					updatedAt: finishedAt,
				})
				.where(eq(hfIngestionRuns.id, runId));
		},

		async finishRunFailed(
			runId: string,
			finishedAt: string,
			errorMessage: string,
		): Promise<void> {
			await database
				.update(hfIngestionRuns)
				.set({
					status: "failed",
					finishedAt,
					errorMessage,
					updatedAt: finishedAt,
				})
				.where(eq(hfIngestionRuns.id, runId));
		},
	};
}

export type HuggingFaceIngestionRepository = ReturnType<
	typeof createHuggingFaceIngestionRepository
>;
