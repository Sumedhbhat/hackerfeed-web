import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import type { DatabaseContext } from "#/server/database/client";
import {
	createPaperFavoriteService,
	InvalidPaperFavoriteCursorError,
	PaperNotFoundError,
} from "#/server/paper-favorites/service";
import { createTrpcContext } from "./context";
import { createAppRouter } from "./router";

const currentUser = { workosUserId: "workos-user-1" };
const favoriteId = "00000000-0000-4000-8000-000000000001";

function savedPaper() {
	return {
		abstract: "Original abstract",
		arxivId: "2607.00001",
		authors: ["Ada Lovelace"],
		githubRepo: "https://github.com/example/repo",
		keywords: ["agents"],
		paperPublishedAt: "2026-07-01T00:00:00.000Z",
		paperUrl: "https://huggingface.co/papers/2607.00001",
		projectPage: "https://example.com/project",
		savedAt: "2026-07-10T12:00:00.000Z",
		summary: "AI summary",
		title: "Canonical paper",
		upvotes: 12,
	};
}

function createHarness() {
	const database = {} as DatabaseContext;
	const calls: Array<
		| { name: "list"; user: unknown; input: unknown }
		| { name: "add"; user: unknown; arxivId: string }
		| { name: "remove"; user: unknown; arxivId: string }
		| { name: "clear"; user: unknown }
	> = [];
	const paperFavorites = {
		async listFavorites(user: unknown, input: unknown) {
			calls.push({ name: "list", user, input });
			if (
				typeof input === "object" &&
				input !== null &&
				"cursor" in input &&
				input.cursor === "invalid-cursor"
			) {
				throw new InvalidPaperFavoriteCursorError();
			}
			return { items: [savedPaper()], nextCursor: "opaque-next-cursor" };
		},
		async addFavorite(user: unknown, arxivId: string) {
			calls.push({ name: "add", user, arxivId });
			if (arxivId === "2607.99999") throw new PaperNotFoundError(arxivId);
		},
		async removeFavorite(user: unknown, arxivId: string) {
			calls.push({ name: "remove", user, arxivId });
		},
		async clearFavorites(user: unknown) {
			calls.push({ name: "clear", user });
		},
	};
	const router = createAppRouter(undefined, undefined, paperFavorites);
	const caller = router.createCaller(
		createTrpcContext({ database, user: currentUser }),
	);

	return { caller, calls, database, router };
}

describe("paper favorites tRPC router", () => {
	it("protects every procedure", async () => {
		const { database, router } = createHarness();
		const caller = router.createCaller(createTrpcContext({ database }));

		for (const call of [
			caller.paperFavorites.list({}),
			caller.paperFavorites.add({ arxivId: "2607.00001" }),
			caller.paperFavorites.remove({ arxivId: "2607.00001" }),
			caller.paperFavorites.clear(),
		]) {
			await expect(call).rejects.toMatchObject({ code: "UNAUTHORIZED" });
		}
	});

	it("validates bounded list and arXiv-only mutation inputs", async () => {
		const { caller, calls } = createHarness();

		await expect(
			caller.paperFavorites.list({ limit: 0 }),
		).rejects.toBeInstanceOf(TRPCError);
		await expect(
			caller.paperFavorites.list({ limit: 51 }),
		).rejects.toBeInstanceOf(TRPCError);
		await expect(
			caller.paperFavorites.add({ arxivId: "not-an-arxiv-id" }),
		).rejects.toBeInstanceOf(TRPCError);
		await expect(
			caller.paperFavorites.add({
				arxivId: "2607.00001",
				appUserId: "forged-user",
			} as { arxivId: string }),
		).rejects.toBeInstanceOf(TRPCError);
		expect(calls).toEqual([]);
	});

	it("maps a missing canonical paper to NOT_FOUND", async () => {
		const { caller } = createHarness();

		await expect(
			caller.paperFavorites.add({ arxivId: "2607.99999" }),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
			message: "Paper 2607.99999 was not found",
		});
	});

	it("maps a malformed opaque cursor to BAD_REQUEST", async () => {
		const { caller } = createHarness();

		await expect(
			caller.paperFavorites.list({ cursor: "invalid-cursor" }),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			message: "Invalid paper favorites cursor",
		});
	});

	it.each([
		[
			"unsupported version",
			{ v: 2, createdAt: "2026-07-10 12:00:00", id: favoriteId },
		],
		[
			"invalid date",
			{ v: 1, createdAt: "2026-02-30 12:00:00", id: favoriteId },
		],
		[
			"invalid ID",
			{ v: 1, createdAt: "2026-07-10 12:00:00", id: "favorite-1" },
		],
	])("maps a cursor with %s to BAD_REQUEST", async (_, payload) => {
		const database = {} as DatabaseContext;
		const service = createPaperFavoriteService(
			{
				async findPaperByArxivId() {
					return null;
				},
				async createFavoriteIfMissing() {},
				async removeFavorite() {},
				async clearFavorites() {},
				async listFavorites() {
					throw new Error("Invalid cursor reached the repository");
				},
			},
			{
				async getOrCreateAppUser() {
					return { id: "app-user-1" };
				},
			},
		);
		const router = createAppRouter(undefined, undefined, service);
		const caller = router.createCaller(
			createTrpcContext({ database, user: currentUser }),
		);

		await expect(
			caller.paperFavorites.list({ cursor: encodeCursor(payload) }),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			message: "Invalid paper favorites cursor",
		});
	});

	it("delegates list, add, remove, and clear with authenticated identity", async () => {
		const { caller, calls } = createHarness();

		await expect(caller.paperFavorites.list({ limit: 10 })).resolves.toEqual({
			items: [savedPaper()],
			nextCursor: "opaque-next-cursor",
		});
		await expect(
			caller.paperFavorites.add({ arxivId: "2607.00001" }),
		).resolves.toEqual({ arxivId: "2607.00001" });
		await caller.paperFavorites.remove({ arxivId: "2607.00001" });
		await caller.paperFavorites.clear();

		expect(calls).toEqual([
			{ name: "list", user: currentUser, input: { limit: 10 } },
			{ name: "add", user: currentUser, arxivId: "2607.00001" },
			{ name: "remove", user: currentUser, arxivId: "2607.00001" },
			{ name: "clear", user: currentUser },
		]);
	});
});

function encodeCursor(value: unknown): string {
	return btoa(JSON.stringify(value))
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replace(/=+$/, "");
}
