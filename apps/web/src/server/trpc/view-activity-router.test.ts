import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";
import type { DatabaseContext } from "#/server/database/client";
import { ViewedPaperNotFoundError } from "#/server/view-activity/service";
import { createTrpcContext } from "./context";
import { createAppRouter } from "./router";

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
	const database = {} as DatabaseContext;
	const calls: Array<
		| {
				name: "story";
				user: unknown;
				story: HackerNewsStoryRecord;
				action: string;
		  }
		| { name: "paper"; user: unknown; arxivId: string; action: string }
	> = [];
	const views = {
		async recordStoryView(
			user: unknown,
			viewedStory: HackerNewsStoryRecord,
			action: string,
		) {
			calls.push({ name: "story", user, story: viewedStory, action });
		},
		async recordPaperView(user: unknown, arxivId: string, action: string) {
			calls.push({ name: "paper", user, arxivId, action });
			if (arxivId === "2607.99999") {
				throw new ViewedPaperNotFoundError(arxivId);
			}
		},
	};
	const router = createAppRouter(undefined, undefined, undefined, views);
	const caller = router.createCaller(
		createTrpcContext({ database, user: currentUser }),
	);

	return { caller, calls, database, router };
}

describe("view activity tRPC router", () => {
	it("protects both write procedures", async () => {
		const { database, router } = createHarness();
		const caller = router.createCaller(createTrpcContext({ database }));

		await expect(
			caller.views.story({ action: "read", story }),
		).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
		await expect(
			caller.views.paper({ action: "read", arxivId: "2607.00001" }),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});

	it("delegates validated inputs with authenticated identity", async () => {
		const { caller, calls } = createHarness();

		await caller.views.story({ action: "discussion_opened", story });
		await caller.views.paper({ action: "chat_opened", arxivId: "2607.00001" });

		expect(calls).toEqual([
			{
				name: "story",
				user: currentUser,
				story,
				action: "discussion_opened",
			},
			{
				name: "paper",
				user: currentUser,
				arxivId: "2607.00001",
				action: "chat_opened",
			},
		]);
	});

	it("rejects forged identity and malformed content inputs", async () => {
		const { caller, calls } = createHarness();

		await expect(
			caller.views.paper({
				action: "read",
				arxivId: "2607.00001",
				appUserId: "forged-user",
			} as { action: "read"; arxivId: string }),
		).rejects.toBeInstanceOf(TRPCError);
		await expect(
			caller.views.paper({ action: "read", arxivId: "not-an-arxiv-id" }),
		).rejects.toBeInstanceOf(TRPCError);
		await expect(
			caller.views.story({ action: "favorited", story } as unknown as {
				action: "read";
				story: HackerNewsStoryRecord;
			}),
		).rejects.toBeInstanceOf(TRPCError);
		expect(calls).toEqual([]);
	});

	it("maps a missing paper to NOT_FOUND", async () => {
		const { caller } = createHarness();

		await expect(
			caller.views.paper({ action: "read", arxivId: "2607.99999" }),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
			message: "Paper 2607.99999 was not found",
		});
	});
});
