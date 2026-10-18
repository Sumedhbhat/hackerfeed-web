import type { hfPapers, paperFavorites } from "#/server/database/schema";
import { sqliteAt } from "../defaults";
import { demoUser } from "./app-users";
import { reasoningBenchmark, sparseAttention } from "./papers";

type PaperFavorite = typeof paperFavorites.$inferSelect;

export const paperFavorite = (
	paper: typeof hfPapers.$inferSelect,
	fields: Pick<PaperFavorite, "createdAt"> & Partial<PaperFavorite>,
): PaperFavorite => ({
	id: `${paper.id}-favorite`,
	appUserId: demoUser.id,
	paperId: paper.id,
	...fields,
});

export const paperFavoriteRows: PaperFavorite[] = [
	paperFavorite(sparseAttention, { createdAt: sqliteAt("10:45:00") }),
	paperFavorite(reasoningBenchmark, { createdAt: sqliteAt("11:45:00") }),
];
