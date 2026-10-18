import type { hfPapers, paperViews } from "#/server/database/schema";
import { sqliteAt } from "../defaults";
import { demoUser } from "./app-users";
import {
	diffusionFixtures,
	reasoningBenchmark,
	smallModels,
	sparseAttention,
} from "./papers";

type PaperView = typeof paperViews.$inferSelect;

export const paperView = (
	paper: typeof hfPapers.$inferSelect,
	fields: Pick<PaperView, "viewedAt"> & Partial<PaperView>,
): PaperView => {
	const appUserId = fields.appUserId ?? demoUser.id;
	return {
		id: `${paper.id}-view`,
		appUserId,
		paperId: paper.id,
		lastUpdatedDate: fields.viewedAt,
		lastUpdatedBy: appUserId,
		...fields,
	};
};

export const paperViewRows: PaperView[] = [
	paperView(sparseAttention, { viewedAt: sqliteAt("01:40:00") }),
	paperView(reasoningBenchmark, { viewedAt: sqliteAt("02:40:00") }),
	paperView(smallModels, { viewedAt: sqliteAt("03:40:00") }),
	paperView(diffusionFixtures, { viewedAt: sqliteAt("04:40:00") }),
];
