import { describe, expect, it } from "vitest";
import { UnauthorizedError } from "#/server/auth/current-user";
import {
	createPaperFavoriteService,
	InvalidPaperFavoriteCursorError,
	PaperNotFoundError,
} from "./service";

type CanonicalPaper = {
	id: string;
	aiSummary: string | null;
	arxivId: string;
	authors: string[];
	githubRepo: string | null;
	keywords: string[];
	paperPublishedAt: string;
	projectPage: string | null;
	summary: string;
	title: string;
	upvotes: number;
};

type Favorite = {
	id: string;
	appUserId: string;
	paperId: string;
	createdAt: string;
};

function canonicalPaper(
	arxivId: string,
	overrides: Partial<CanonicalPaper> = {},
): CanonicalPaper {
	return {
		id: `paper-${arxivId}`,
		aiSummary: "AI summary",
		arxivId,
		authors: ["Ada Lovelace", "Grace Hopper"],
		githubRepo: "https://github.com/example/paper",
		keywords: ["agents", "reasoning"],
		paperPublishedAt: "2026-07-01T10:00:00.000Z",
		projectPage: "https://example.com/paper",
		summary: "Original abstract",
		title: `Paper ${arxivId}`,
		upvotes: 42,
		...overrides,
	};
}

function createHarness() {
	const papers = [
		canonicalPaper("2607.00001"),
		canonicalPaper("2607.00002", {
			aiSummary: null,
			summary: "Source summary",
		}),
		canonicalPaper("2607.00003"),
	];
	const favorites: Favorite[] = [];
	const appUsers = new Map<string, string>();
	const resolvedIdentities: string[] = [];
	let nextFavoriteId = 1;
	let nextUserId = 1;
	let nextCreatedAt = Date.parse("2026-07-10T12:00:00.000Z");
	const listCursors: Array<{ createdAt: string; id: string } | undefined> = [];

	const users = {
		async getOrCreateAppUser(identity: { workosUserId: string }) {
			resolvedIdentities.push(identity.workosUserId);
			let id = appUsers.get(identity.workosUserId);
			if (!id) {
				id = `user-${nextUserId}`;
				nextUserId += 1;
				appUsers.set(identity.workosUserId, id);
			}

			return { id };
		},
	};

	const repository = {
		async findPaperByArxivId(arxivId: string) {
			const paper = papers.find((candidate) => candidate.arxivId === arxivId);
			return paper ? { id: paper.id } : null;
		},

		async createFavoriteIfMissing(appUserId: string, paperId: string) {
			let favorite = favorites.find(
				(candidate) =>
					candidate.appUserId === appUserId && candidate.paperId === paperId,
			);
			if (!favorite) {
				favorite = {
					id: `00000000-0000-4000-8000-${String(nextFavoriteId).padStart(12, "0")}`,
					appUserId,
					paperId,
					createdAt: new Date(nextCreatedAt)
						.toISOString()
						.slice(0, 19)
						.replace("T", " "),
				};
				nextFavoriteId += 1;
				nextCreatedAt += 1_000;
				favorites.push(favorite);
			}

			return favorite;
		},

		async removeFavorite(appUserId: string, arxivId: string) {
			const paper = papers.find((candidate) => candidate.arxivId === arxivId);
			const index = favorites.findIndex(
				(favorite) =>
					favorite.appUserId === appUserId && favorite.paperId === paper?.id,
			);
			if (index >= 0) favorites.splice(index, 1);
		},

		async clearFavorites(appUserId: string) {
			for (let index = favorites.length - 1; index >= 0; index -= 1) {
				if (favorites[index]?.appUserId === appUserId) {
					favorites.splice(index, 1);
				}
			}
		},

		async listFavorites(
			appUserId: string,
			limit: number,
			cursor?: { createdAt: string; id: string },
		) {
			listCursors.push(cursor);
			const ordered = favorites
				.filter((favorite) => favorite.appUserId === appUserId)
				.filter(
					(favorite) =>
						!cursor ||
						favorite.createdAt < cursor.createdAt ||
						(favorite.createdAt === cursor.createdAt &&
							favorite.id < cursor.id),
				)
				.sort(
					(left, right) =>
						right.createdAt.localeCompare(left.createdAt) ||
						right.id.localeCompare(left.id),
				);
			const page = ordered.slice(0, limit);
			const last = page.at(-1);

			return {
				items: page.map((favorite) => {
					const paper = papers.find(
						(candidate) => candidate.id === favorite.paperId,
					);
					if (!paper)
						throw new Error("Missing canonical paper in test harness");

					const { id: _, ...metadata } = paper;
					return { ...metadata, savedAt: favorite.createdAt };
				}),
				nextCursor:
					ordered.length > limit && last
						? { createdAt: last.createdAt, id: last.id }
						: null,
			};
		},
	};

	return {
		favorites,
		listCursors,
		papers,
		resolvedIdentities,
		service: createPaperFavoriteService(repository, users),
	};
}

const userOne = { workosUserId: "workos-user-1" };
const userTwo = { workosUserId: "workos-user-2" };

describe("paper favorite service", () => {
	it("requires authentication and resolves the app user from WorkOS identity", async () => {
		const { favorites, resolvedIdentities, service } = createHarness();

		await expect(
			service.addFavorite(null, "2607.00001"),
		).rejects.toBeInstanceOf(UnauthorizedError);
		await service.addFavorite(userOne, "2607.00001");

		expect(resolvedIdentities).toEqual(["workos-user-1"]);
		expect(favorites[0]).toMatchObject({ appUserId: "user-1" });
	});

	it("rejects an unknown canonical paper without creating a favorite", async () => {
		const { favorites, service } = createHarness();

		await expect(
			service.addFavorite(userOne, "2607.99999"),
		).rejects.toBeInstanceOf(PaperNotFoundError);
		expect(favorites).toEqual([]);
	});

	it("adds and removes idempotently while isolating users", async () => {
		const { favorites, service } = createHarness();

		await service.addFavorite(userOne, "2607.00001");
		await service.addFavorite(userOne, "2607.00001");
		await service.addFavorite(userTwo, "2607.00001");
		expect(favorites).toHaveLength(2);

		await service.removeFavorite(userOne, "2607.00001");
		await service.removeFavorite(userOne, "2607.00001");
		await service.removeFavorite(userOne, "2607.99999");

		expect(favorites).toHaveLength(1);
		expect(favorites[0]?.appUserId).toBe("user-2");
	});

	it("clears only the authenticated user's favorites", async () => {
		const { favorites, service } = createHarness();

		await service.addFavorite(userOne, "2607.00001");
		await service.addFavorite(userOne, "2607.00002");
		await service.addFavorite(userTwo, "2607.00003");
		await service.clearFavorites(userOne);

		expect(favorites).toHaveLength(1);
		expect(favorites[0]?.appUserId).toBe("user-2");
	});

	it("lists deterministic newest-first pages with canonical metadata", async () => {
		const { favorites, service } = createHarness();

		await service.addFavorite(userOne, "2607.00001");
		await service.addFavorite(userOne, "2607.00002");
		await service.addFavorite(userOne, "2607.00003");
		const tiedCreatedAt = "2026-07-10 12:00:00";
		for (const favorite of favorites) favorite.createdAt = tiedCreatedAt;

		const firstPage = await service.listFavorites(userOne, { limit: 2 });
		expect(firstPage.items.map((paper) => paper.arxivId)).toEqual([
			"2607.00003",
			"2607.00002",
		]);
		expect(firstPage.nextCursor).toEqual(expect.any(String));
		expect(firstPage.items[1]).toEqual({
			abstract: null,
			arxivId: "2607.00002",
			authors: ["Ada Lovelace", "Grace Hopper"],
			githubRepo: "https://github.com/example/paper",
			keywords: ["agents", "reasoning"],
			paperPublishedAt: "2026-07-01T10:00:00.000Z",
			paperUrl: "https://huggingface.co/papers/2607.00002",
			projectPage: "https://example.com/paper",
			savedAt: "2026-07-10T12:00:00.000Z",
			summary: "Source summary",
			title: "Paper 2607.00002",
			upvotes: 42,
		});

		const secondPage = await service.listFavorites(userOne, {
			cursor: firstPage.nextCursor ?? undefined,
			limit: 2,
		});
		expect(secondPage.items.map((paper) => paper.arxivId)).toEqual([
			"2607.00001",
		]);
		expect(secondPage.nextCursor).toBeNull();
	});

	it("emits a versioned cursor and passes its validated keyset to the repository", async () => {
		const { listCursors, service } = createHarness();
		await service.addFavorite(userOne, "2607.00001");
		await service.addFavorite(userOne, "2607.00002");

		const firstPage = await service.listFavorites(userOne, { limit: 1 });
		const cursor = firstPage.nextCursor;
		if (!cursor) throw new Error("Expected a next cursor");
		expect(
			JSON.parse(atob(cursor.replaceAll("-", "+").replaceAll("_", "/"))),
		).toEqual({
			v: 1,
			createdAt: "2026-07-10 12:00:01",
			id: "00000000-0000-4000-8000-000000000002",
		});

		await service.listFavorites(userOne, { cursor, limit: 1 });
		expect(listCursors.at(-1)).toEqual({
			createdAt: "2026-07-10 12:00:01",
			id: "00000000-0000-4000-8000-000000000002",
		});
	});

	it.each([
		["malformed base64", "not+a+cursor"],
		[
			"unsupported version",
			encodeTestCursor({
				v: 2,
				createdAt: "2026-07-10 12:00:00",
				id: "00000000-0000-4000-8000-000000000001",
			}),
		],
		[
			"invalid date",
			encodeTestCursor({
				v: 1,
				createdAt: "2026-02-30 12:00:00",
				id: "00000000-0000-4000-8000-000000000001",
			}),
		],
		[
			"non-D1 timestamp",
			encodeTestCursor({
				v: 1,
				createdAt: "2026-07-10T12:00:00.000Z",
				id: "00000000-0000-4000-8000-000000000001",
			}),
		],
		[
			"invalid favorite ID",
			encodeTestCursor({
				v: 1,
				createdAt: "2026-07-10 12:00:00",
				id: "favorite-001",
			}),
		],
		[
			"extra field",
			encodeTestCursor({
				v: 1,
				createdAt: "2026-07-10 12:00:00",
				id: "00000000-0000-4000-8000-000000000001",
				extra: true,
			}),
		],
	])("rejects a cursor with %s before repository use", async (_, cursor) => {
		const { listCursors, service } = createHarness();

		await expect(
			service.listFavorites(userOne, { cursor, limit: 20 }),
		).rejects.toBeInstanceOf(InvalidPaperFavoriteCursorError);
		expect(listCursors).toEqual([]);
	});

	it("sanitizes optional upstream URLs in saved-paper output", async () => {
		const { papers, service } = createHarness();
		if (!papers[0]) throw new Error("Expected paper fixture");
		papers[0].githubRepo = "javascript:alert(1)";
		papers[0].projectPage = "http://example.com/project";
		await service.addFavorite(userOne, "2607.00001");

		const page = await service.listFavorites(userOne, { limit: 20 });

		expect(page.items[0]).toMatchObject({
			githubRepo: null,
			projectPage: null,
		});
	});
});

function encodeTestCursor(value: unknown): string {
	return btoa(JSON.stringify(value))
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replace(/=+$/, "");
}
