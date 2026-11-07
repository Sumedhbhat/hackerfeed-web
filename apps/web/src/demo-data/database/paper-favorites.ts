import type {
	hfPapers,
	paperFavorites,
} from "@hackerfeed/backend/database/schema";
import { sqliteAt } from "../defaults";
import { demoUser } from "./app-users";
import { paperRows } from "./papers";

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

/** The demo reader has saved the first two papers. */
export const paperFavoriteRows: PaperFavorite[] = paperRows
	.slice(0, 2)
	.map((paper, index) =>
		paperFavorite(paper, { createdAt: sqliteAt(`1${index}:45:00`) }),
	);
