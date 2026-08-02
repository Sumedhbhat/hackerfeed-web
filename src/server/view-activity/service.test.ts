import { describe, expect, it } from "vitest";
import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";
import { UnauthorizedError } from "#/server/auth/current-user";
import { createViewActivityService, ViewedPaperNotFoundError } from "./service";

const currentUser = { workosUserId: "workos-user-1" };
const story: HackerNewsStoryRecord = {
	by: "alice",
	descendants: 3,
	id: 123,
	kids: [],
	score: 42,
	text: null,
	time: 1_700_000_000,
	title: "Story",
	type: "story",
	url: "https://example.com/story",
};

function createHarness() {
	const storyViews: Array<{ appUserId: string; story: HackerNewsStoryRecord }> =
		[];
	const paperViews: Array<{ appUserId: string; paperId: string }> = [];
	const service = createViewActivityService(
		{
			async recordStoryView(appUserId, viewedStory) {
				storyViews.push({ appUserId, story: viewedStory });
			},
			async findPaperByArxivId(arxivId) {
				return arxivId === "2607.00001" ? { id: "paper-1" } : null;
			},
			async recordPaperView(appUserId, paperId) {
				paperViews.push({ appUserId, paperId });
			},
		},
		{
			async getOrCreateAppUser(identity) {
				return { id: `app-${identity.workosUserId}` };
			},
		},
	);

	return { paperViews, service, storyViews };
}

describe("view activity service", () => {
	it("records every story and paper click against the authenticated app user", async () => {
		const { paperViews, service, storyViews } = createHarness();

		await service.recordStoryView(currentUser, story);
		await service.recordStoryView(currentUser, story);
		await service.recordPaperView(currentUser, "2607.00001");

		expect(storyViews).toHaveLength(2);
		expect(storyViews[0]).toEqual({
			appUserId: "app-workos-user-1",
			story,
		});
		expect(paperViews).toEqual([
			{ appUserId: "app-workos-user-1", paperId: "paper-1" },
		]);
	});

	it("requires authentication", async () => {
		const { service } = createHarness();

		await expect(service.recordStoryView(null, story)).rejects.toBeInstanceOf(
			UnauthorizedError,
		);
		await expect(
			service.recordPaperView(null, "2607.00001"),
		).rejects.toBeInstanceOf(UnauthorizedError);
	});

	it("rejects a view for a paper that is not stored", async () => {
		const { paperViews, service } = createHarness();

		await expect(
			service.recordPaperView(currentUser, "2607.99999"),
		).rejects.toBeInstanceOf(ViewedPaperNotFoundError);
		expect(paperViews).toEqual([]);
	});
});
