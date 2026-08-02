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
		| { name: "story"; user: unknown; story: HackerNewsStoryRecord }
		| { name: "paper"; user: unknown; arxivId: string }
	> = [];
	const views = {
		async recordStoryView(user: unknown, viewedStory: HackerNewsStoryRecord) {
			calls.push({ name: "story", user, story: viewedStory });
		},
		async recordPaperView(user: unknown, arxivId: string) {
			calls.push({ name: "paper", user, arxivId });
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

		await expect(caller.views.story(story)).rejects.toMatchObject({
			code: "UNAUTHORIZED",
		});
		await expect(
			caller.views.paper({ arxivId: "2607.00001" }),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
	});

	it("delegates validated inputs with authenticated identity", async () => {
		const { caller, calls } = createHarness();

		await caller.views.story(story);
		await caller.views.paper({ arxivId: "2607.00001" });

		expect(calls).toEqual([
			{ name: "story", user: currentUser, story },
			{ name: "paper", user: currentUser, arxivId: "2607.00001" },
		]);
	});

	it("rejects forged identity and malformed content inputs", async () => {
		const { caller, calls } = createHarness();

		await expect(
			caller.views.paper({
				arxivId: "2607.00001",
				appUserId: "forged-user",
			} as { arxivId: string }),
		).rejects.toBeInstanceOf(TRPCError);
		await expect(
			caller.views.paper({ arxivId: "not-an-arxiv-id" }),
		).rejects.toBeInstanceOf(TRPCError);
		expect(calls).toEqual([]);
	});

	it("maps a missing paper to NOT_FOUND", async () => {
		const { caller } = createHarness();

		await expect(
			caller.views.paper({ arxivId: "2607.99999" }),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
			message: "Paper 2607.99999 was not found",
		});
	});
});
