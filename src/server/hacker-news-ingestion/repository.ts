import "@tanstack/react-start/server-only";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { HackerNewsIngestionStory } from "#/lib/hacker-news/schemas";
import type { DatabaseContext } from "#/server/database/client";
import {
	hnIngestionRuns,
	hnStoryFeedObservations,
	hnStoryVersions,
	stories,
} from "#/server/database/schema";
import type {
	HackerNewsFetchedStory,
	HackerNewsIngestionSnapshot,
} from "./client";

const QUERY_CHUNK_SIZE = 90;

type DrizzleBatch = [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]];
type StoryRow = typeof stories.$inferSelect;

type EffectiveStoryState = {
	availabilityStatus: "active" | "dead" | "deleted";
	title: string | null;
	url: string | null;
	text: string | null;
	score: number;
	hnPostedAt: string | null;
	authorUsername: string | null;
	commentCount: number;
	commentIds: string;
};

type OpenVersion = EffectiveStoryState & {
	id: string;
	storyId: string;
	validFrom: string;
};

export type HackerNewsPersistenceCounts = {
	stories: number;
	versions: number;
	feedObservations: number;
};

export type HackerNewsRunCounts = HackerNewsPersistenceCounts & {
	topIds: number;
	newIds: number;
	bestIds: number;
	uniqueSelected: number;
	fetched: number;
	skipped: number;
};

type CreateRunInput = {
	observedHour: string;
	startedAt: string;
	sourceBaseUrl: string;
	perFeedLimit: number;
};

function chunks<T>(values: T[]): T[][] {
	const result: T[][] = [];
	for (let index = 0; index < values.length; index += QUERY_CHUNK_SIZE) {
		result.push(values.slice(index, index + QUERY_CHUNK_SIZE));
	}
	return result;
}

function storyId(hnStoryId: number): string {
	return `hn-story:${hnStoryId}`;
}

function versionId(hnStoryId: number, observedHour: string): string {
	return `hn-version:${hnStoryId}:${observedHour}`;
}

function observationId(hnStoryId: number, observedHour: string): string {
	return `hn-observation:${hnStoryId}:${observedHour}`;
}

function effectiveState(
	story: HackerNewsIngestionStory,
	existing: StoryRow | undefined,
): EffectiveStoryState {
	const preserveMissing = story.availabilityStatus !== "active";
	return {
		availabilityStatus: story.availabilityStatus,
		title: preserveMissing
			? (story.title ?? existing?.title ?? null)
			: story.title,
		url: preserveMissing ? (story.url ?? existing?.url ?? null) : story.url,
		text: preserveMissing ? (story.text ?? existing?.text ?? null) : story.text,
		score: preserveMissing
			? (story.score ?? existing?.score ?? 0)
			: (story.score ?? 0),
		hnPostedAt:
			story.time === null
				? preserveMissing
					? (existing?.hnPostedAt ?? null)
					: null
				: new Date(story.time * 1000).toISOString(),
		authorUsername: preserveMissing
			? (story.by ?? existing?.authorUsername ?? null)
			: story.by,
		commentCount: preserveMissing
			? (story.descendants ?? existing?.commentCount ?? 0)
			: (story.descendants ?? 0),
		commentIds:
			story.kids === null
				? (existing?.commentIds ?? "[]")
				: JSON.stringify(story.kids),
	};
}

function versionsMatch(
	version: OpenVersion,
	state: EffectiveStoryState,
): boolean {
	return (
		version.availabilityStatus === state.availabilityStatus &&
		version.title === state.title &&
		version.url === state.url &&
		version.text === state.text &&
		version.score === state.score &&
		version.hnPostedAt === state.hnPostedAt &&
		version.authorUsername === state.authorUsername &&
		version.commentCount === state.commentCount &&
		version.commentIds === state.commentIds
	);
}

async function loadExistingStories(
	database: DatabaseContext,
	hnStoryIds: number[],
): Promise<Map<number, StoryRow>> {
	const result = new Map<number, StoryRow>();
	for (const part of chunks(hnStoryIds)) {
		const rows = await database
			.select()
			.from(stories)
			.where(inArray(stories.hnStoryId, part));
		for (const row of rows) result.set(row.hnStoryId, row);
	}
	return result;
}

async function loadOpenVersions(
	database: DatabaseContext,
	hnStoryIds: number[],
): Promise<Map<number, OpenVersion>> {
	const result = new Map<number, OpenVersion>();
	for (const part of chunks(hnStoryIds)) {
		const rows = await database
			.select({
				hnStoryId: stories.hnStoryId,
				id: hnStoryVersions.id,
				storyId: hnStoryVersions.storyId,
				availabilityStatus: hnStoryVersions.availabilityStatus,
				title: hnStoryVersions.title,
				url: hnStoryVersions.url,
				text: hnStoryVersions.text,
				score: hnStoryVersions.score,
				hnPostedAt: hnStoryVersions.hnPostedAt,
				authorUsername: hnStoryVersions.authorUsername,
				commentCount: hnStoryVersions.commentCount,
				commentIds: hnStoryVersions.commentIds,
				validFrom: hnStoryVersions.validFrom,
			})
			.from(hnStoryVersions)
			.innerJoin(stories, eq(stories.id, hnStoryVersions.storyId))
			.where(
				and(isNull(hnStoryVersions.validTo), inArray(stories.hnStoryId, part)),
			);
		for (const row of rows) result.set(row.hnStoryId, row);
	}
	return result;
}

function canonicalWrite(
	database: DatabaseContext,
	item: HackerNewsFetchedStory,
	existing: StoryRow | undefined,
	state: EffectiveStoryState,
	observedHour: string,
) {
	const id = existing?.id ?? storyId(item.story.id);
	return database
		.insert(stories)
		.values({
			id,
			hnStoryId: item.story.id,
			...state,
			firstIngestedAt: existing?.firstIngestedAt ?? observedHour,
			lastIngestedAt: observedHour,
		})
		.onConflictDoUpdate({
			target: stories.hnStoryId,
			set: {
				...state,
				firstIngestedAt: sql`coalesce(${stories.firstIngestedAt}, ${observedHour})`,
				lastIngestedAt: observedHour,
			},
		});
}

export function createHackerNewsIngestionRepository(database: DatabaseContext) {
	return {
		async createRun(input: CreateRunInput): Promise<string> {
			const [run] = await database
				.insert(hnIngestionRuns)
				.values({
					observedHour: input.observedHour,
					status: "running",
					startedAt: input.startedAt,
					sourceBaseUrl: input.sourceBaseUrl,
					perFeedLimit: input.perFeedLimit,
					createdAt: input.startedAt,
					updatedAt: input.startedAt,
				})
				.returning({ id: hnIngestionRuns.id });

			if (!run) throw new Error("D1 Hacker News ingestion run insert failed");
			return run.id;
		},

		async persistSnapshot(
			runId: string,
			observedHour: string,
			snapshot: HackerNewsIngestionSnapshot,
			recordedAt: string,
		): Promise<HackerNewsPersistenceCounts> {
			if (snapshot.stories.length === 0) {
				return { stories: 0, versions: 0, feedObservations: 0 };
			}

			const hnStoryIds = snapshot.stories.map((item) => item.story.id);
			const [existingStories, openVersions] = await Promise.all([
				loadExistingStories(database, hnStoryIds),
				loadOpenVersions(database, hnStoryIds),
			]);
			const writes: BatchItem<"sqlite">[] = [];
			let insertedVersionCount = 0;

			for (const item of snapshot.stories) {
				const existing = existingStories.get(item.story.id);
				const state = effectiveState(item.story, existing);
				const resolvedStoryId = existing?.id ?? storyId(item.story.id);
				const openVersion = openVersions.get(item.story.id);
				let resolvedVersionId = openVersion?.id;

				writes.push(
					canonicalWrite(database, item, existing, state, observedHour),
				);

				if (!openVersion) {
					resolvedVersionId = versionId(item.story.id, observedHour);
					insertedVersionCount += 1;
					writes.push(
						database.insert(hnStoryVersions).values({
							id: resolvedVersionId,
							ingestionRunId: runId,
							storyId: resolvedStoryId,
							...state,
							validFrom: observedHour,
							validTo: null,
							recordedAt,
						}),
					);
				} else if (!versionsMatch(openVersion, state)) {
					if (openVersion.validFrom === observedHour) {
						writes.push(
							database
								.update(hnStoryVersions)
								.set({ ingestionRunId: runId, ...state, recordedAt })
								.where(eq(hnStoryVersions.id, openVersion.id)),
						);
					} else {
						resolvedVersionId = versionId(item.story.id, observedHour);
						insertedVersionCount += 1;
						writes.push(
							database
								.update(hnStoryVersions)
								.set({ validTo: observedHour })
								.where(
									and(
										eq(hnStoryVersions.id, openVersion.id),
										isNull(hnStoryVersions.validTo),
									),
								),
							database.insert(hnStoryVersions).values({
								id: resolvedVersionId,
								ingestionRunId: runId,
								storyId: resolvedStoryId,
								...state,
								validFrom: observedHour,
								validTo: null,
								recordedAt,
							}),
						);
					}
				}

				if (!resolvedVersionId) {
					throw new Error(
						`No Hacker News version resolved for ${item.story.id}`,
					);
				}

				writes.push(
					database
						.insert(hnStoryFeedObservations)
						.values({
							id: observationId(item.story.id, observedHour),
							ingestionRunId: runId,
							storyId: resolvedStoryId,
							storyVersionId: resolvedVersionId,
							observedHour,
							...item.ranks,
							createdAt: recordedAt,
							updatedAt: recordedAt,
						})
						.onConflictDoUpdate({
							target: [
								hnStoryFeedObservations.observedHour,
								hnStoryFeedObservations.storyId,
							],
							set: {
								ingestionRunId: runId,
								storyVersionId: resolvedVersionId,
								...item.ranks,
								updatedAt: recordedAt,
							},
						}),
				);
			}

			await database.batch(writes as DrizzleBatch);
			return {
				stories: snapshot.stories.length,
				versions: insertedVersionCount,
				feedObservations: snapshot.stories.length,
			};
		},

		async finishRunSuccess(
			runId: string,
			finishedAt: string,
			counts: HackerNewsRunCounts,
		): Promise<void> {
			await database
				.update(hnIngestionRuns)
				.set({
					status: "success",
					finishedAt,
					topIdCount: counts.topIds,
					newIdCount: counts.newIds,
					bestIdCount: counts.bestIds,
					uniqueSelectedCount: counts.uniqueSelected,
					fetchedCount: counts.fetched,
					persistedStoryCount: counts.stories,
					insertedVersionCount: counts.versions,
					persistedFeedObservationCount: counts.feedObservations,
					skippedCount: counts.skipped,
					updatedAt: finishedAt,
				})
				.where(eq(hnIngestionRuns.id, runId));
		},

		async finishRunFailed(
			runId: string,
			finishedAt: string,
			errorMessage: string,
		): Promise<void> {
			await database
				.update(hnIngestionRuns)
				.set({
					status: "failed",
					finishedAt,
					errorMessage,
					updatedAt: finishedAt,
				})
				.where(eq(hnIngestionRuns.id, runId));
		},
	};
}

export type HackerNewsIngestionRepository = ReturnType<
	typeof createHackerNewsIngestionRepository
>;
