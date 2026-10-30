import "@tanstack/react-start/server-only";

import { and, eq, inArray } from "drizzle-orm";
import type { DatabaseContext } from "#/server/database/client";
import {
	hfAuthors,
	hfPaperAuthors,
	hfPaperKeywords,
} from "#/server/database/schema";

export async function loadPaperMetadata(
	database: DatabaseContext,
	paperIds: string[],
) {
	const [authorRows, keywordRows] = await Promise.all([
		database
			.select({
				paperId: hfPaperAuthors.paperId,
				name: hfAuthors.name,
				position: hfPaperAuthors.position,
			})
			.from(hfPaperAuthors)
			.innerJoin(hfAuthors, eq(hfPaperAuthors.authorId, hfAuthors.id))
			.where(
				and(
					inArray(hfPaperAuthors.paperId, paperIds),
					eq(hfAuthors.hidden, false),
				),
			)
			.orderBy(hfPaperAuthors.paperId, hfPaperAuthors.position),
		database
			.select({
				paperId: hfPaperKeywords.paperId,
				keyword: hfPaperKeywords.keywordNormalized,
				position: hfPaperKeywords.position,
			})
			.from(hfPaperKeywords)
			.where(inArray(hfPaperKeywords.paperId, paperIds))
			.orderBy(hfPaperKeywords.paperId, hfPaperKeywords.position),
	]);

	const authorsByPaper = new Map<string, string[]>();
	for (const author of authorRows) {
		const authors = authorsByPaper.get(author.paperId) ?? [];
		authors.push(author.name);
		authorsByPaper.set(author.paperId, authors);
	}

	const keywordsByPaper = new Map<string, string[]>();
	for (const keyword of keywordRows) {
		const keywords = keywordsByPaper.get(keyword.paperId) ?? [];
		keywords.push(keyword.keyword);
		keywordsByPaper.set(keyword.paperId, keywords);
	}

	return { authorsByPaper, keywordsByPaper };
}
