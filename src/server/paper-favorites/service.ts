import "@tanstack/react-start/server-only";

import { z } from "zod";
import type {
	PaperFavoritesListInput,
	PaperFavoritesListOutput,
} from "#/lib/paper-favorites/schemas";
import {
	type AuthenticatedWorkosUser,
	resolveCurrentWorkosUser,
} from "#/server/auth/current-user";
import type { DatabaseContext } from "#/server/database/client";
import { projectPaperPresentation } from "#/server/huggingface-papers/paper-presentation";
import { createUserServiceFromDatabase } from "#/server/users/service";
import {
	createPaperFavoriteRepository,
	type PaperFavoriteCursor,
	type PaperFavoriteListRecord,
} from "./repository";

type CurrentUserInput = Parameters<typeof resolveCurrentWorkosUser>[0];

type PaperFavoriteRepositoryDependency = {
	findPaperByArxivId(arxivId: string): PromiseLike<{ id: string } | null>;
	createFavoriteIfMissing(
		appUserId: string,
		paperId: string,
	): PromiseLike<unknown>;
	removeFavorite(appUserId: string, arxivId: string): PromiseLike<unknown>;
	clearFavorites(appUserId: string): PromiseLike<unknown>;
	listFavorites(
		appUserId: string,
		limit: number,
		cursor?: PaperFavoriteCursor,
	): PromiseLike<{
		items: PaperFavoriteListRecord[];
		nextCursor: PaperFavoriteCursor | null;
	}>;
};

type UserServiceDependency = {
	getOrCreateAppUser(
		identity: AuthenticatedWorkosUser,
	): PromiseLike<{ id: string }>;
};

export class PaperNotFoundError extends Error {
	constructor(arxivId: string) {
		super(`Paper ${arxivId} was not found`);
		this.name = "PaperNotFoundError";
	}
}

export class InvalidPaperFavoriteCursorError extends Error {
	constructor() {
		super("Invalid paper favorites cursor");
		this.name = "InvalidPaperFavoriteCursorError";
	}
}

const d1TimestampSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
	.refine((value) => {
		const date = new Date(`${value.replace(" ", "T")}Z`);
		return (
			!Number.isNaN(date.getTime()) &&
			date.toISOString().slice(0, 19).replace("T", " ") === value
		);
	});

const paperFavoriteCursorSchema = z
	.object({
		v: z.literal(1),
		createdAt: d1TimestampSchema,
		id: z
			.string()
			.regex(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
			),
	})
	.strict();

function encodeCursor(cursor: PaperFavoriteCursor): string {
	return btoa(JSON.stringify({ v: 1, ...cursor }))
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replace(/=+$/, "");
}

function decodeCursor(cursor: string): PaperFavoriteCursor {
	try {
		if (!/^[A-Za-z0-9_-]+$/.test(cursor) || cursor.length % 4 === 1) {
			throw new InvalidPaperFavoriteCursorError();
		}
		const base64 = cursor.replaceAll("-", "+").replaceAll("_", "/");
		const parsed = paperFavoriteCursorSchema.parse(JSON.parse(atob(base64)));

		return { createdAt: parsed.createdAt, id: parsed.id };
	} catch (error) {
		if (error instanceof InvalidPaperFavoriteCursorError) throw error;
		throw new InvalidPaperFavoriteCursorError();
	}
}

function toIsoDate(value: string): string {
	const date = new Date(
		value.includes("T") ? value : `${value.replace(" ", "T")}Z`,
	);
	return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function createPaperFavoriteService(
	favorites: PaperFavoriteRepositoryDependency,
	users: UserServiceDependency,
) {
	async function getAppUser(user: CurrentUserInput) {
		const identity = resolveCurrentWorkosUser(user);
		return users.getOrCreateAppUser(identity);
	}

	return {
		async listFavorites(
			user: CurrentUserInput,
			input: PaperFavoritesListInput,
		): Promise<PaperFavoritesListOutput> {
			const appUser = await getAppUser(user);
			const page = await favorites.listFavorites(
				appUser.id,
				input.limit,
				input.cursor ? decodeCursor(input.cursor) : undefined,
			);

			return {
				items: page.items.map(({ aiSummary, ...paper }) => ({
					...paper,
					...projectPaperPresentation({ ...paper, aiSummary }),
					savedAt: toIsoDate(paper.savedAt),
				})),
				nextCursor: page.nextCursor ? encodeCursor(page.nextCursor) : null,
			};
		},

		async addFavorite(user: CurrentUserInput, arxivId: string): Promise<void> {
			const appUser = await getAppUser(user);
			const paper = await favorites.findPaperByArxivId(arxivId);
			if (!paper) throw new PaperNotFoundError(arxivId);

			await favorites.createFavoriteIfMissing(appUser.id, paper.id);
		},

		async removeFavorite(
			user: CurrentUserInput,
			arxivId: string,
		): Promise<void> {
			const appUser = await getAppUser(user);
			await favorites.removeFavorite(appUser.id, arxivId);
		},

		async clearFavorites(user: CurrentUserInput): Promise<void> {
			const appUser = await getAppUser(user);
			await favorites.clearFavorites(appUser.id);
		},
	};
}

export function createPaperFavoriteServiceFromDatabase(
	database: DatabaseContext,
) {
	return createPaperFavoriteService(
		createPaperFavoriteRepository(database),
		createUserServiceFromDatabase(database),
	);
}

export type PaperFavoriteService = ReturnType<
	typeof createPaperFavoriteService
>;
