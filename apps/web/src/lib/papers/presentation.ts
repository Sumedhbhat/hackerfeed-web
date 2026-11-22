import {
	buildChatUrl,
	type ChatProviderId,
} from "@hackerfeed/entities/chat-providers";
import type { PaperFeedPaper } from "@hackerfeed/entities/papers";

/** What a paper row needs to render; shared by the feed and saved papers. */
export type PaperPresentation = Omit<
	PaperFeedPaper,
	"entryPublishedAt" | "rank"
>;

export function formatAuthors(authors: string[]): string {
	if (authors.length === 0) return "Authors unavailable";
	if (authors.length <= 3) return authors.join(", ");

	return `${authors.slice(0, 3).join(", ")} +${authors.length - 3}`;
}

export function formatPaperDate(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;

	return new Intl.DateTimeFormat("en", {
		day: "numeric",
		month: "short",
		timeZone: "UTC",
	}).format(date);
}

export function matchesFilters(
	paper: Pick<PaperFeedPaper, "title" | "summary" | "authors" | "keywords">,
	query: string,
	topic?: string,
): boolean {
	if (topic && !paper.keywords.includes(topic)) return false;
	if (!query) return true;

	const searchable = [
		paper.title,
		paper.summary,
		...paper.authors,
		...paper.keywords,
	]
		.join(" ")
		.toLocaleLowerCase();

	return searchable.includes(query.toLocaleLowerCase());
}

export function buildPaperChatUrl(
	paper: PaperPresentation,
	provider: ChatProviderId,
): string {
	const prompt = [
		"I want to discuss this research paper and understand it completely.",
		`Title: ${paper.title}`,
		`Paper URL: ${paper.paperUrl}`,
		paper.projectPage ? `Project page: ${paper.projectPage}` : null,
		paper.githubRepo ? `Code: ${paper.githubRepo}` : null,
		"",
		"Please help me understand the core idea, why it matters, and where its useful.",
		"I will be asking you a huge series of questions about this paper and want them answered.",
	].filter(Boolean);

	return buildChatUrl(provider, prompt.join("\n"));
}
