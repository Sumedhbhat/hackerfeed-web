import type { HackerNewsStoryRecord } from "@hackerfeed/entities/hacker-news";

export function hnStory(
	overrides: Partial<HackerNewsStoryRecord> = {},
): HackerNewsStoryRecord {
	return {
		by: "alice",
		descendants: 3,
		id: 123,
		kids: [1, 2],
		score: 42,
		text: null,
		time: 1_700_000_000,
		title: "Original title",
		type: "story",
		url: "https://example.com/original",
		...overrides,
	};
}

type DailyPaperOverrides = {
	arxivId?: string;
	title?: string;
	upvotes?: number;
	keywords?: string[];
	publishedAt?: string;
	summary?: string;
	aiSummary?: string | null;
	authors?: string[];
	projectPage?: string | null;
	githubRepo?: string | null;
};

/** One entry of Hugging Face's `GET /api/daily_papers` response, as it is sent. */
export function dailyPapersEntry({
	arxivId = "2606.12345",
	title = "Example Paper",
	upvotes = 12,
	keywords = ["Large Language Models", "Agents"],
	publishedAt = "2026-06-19T00:00:00.000Z",
	summary = "Abstract",
	aiSummary = "Short summary",
	authors = ["Ada Lovelace"],
	projectPage = null,
	githubRepo = null,
}: DailyPaperOverrides = {}) {
	return {
		isAuthorParticipating: true,
		paper: {
			ai_keywords: keywords,
			ai_summary: aiSummary,
			ai_summary_model: "example/model",
			authors: authors.map((name, index) => ({
				_id: `author-${arxivId}-${index}`,
				hidden: false,
				name,
				user: {
					_id: `user-${name}`,
					avatarUrl: "/avatar.png",
					fullname: name,
					name,
					user: name,
				},
			})),
			discussionId: `discussion-${arxivId}`,
			githubRepo,
			projectPage,
			id: arxivId,
			organization: {
				_id: "org-1",
				fullname: "Example Research",
				name: "example-research",
			},
			publishedAt: "2026-06-18T00:00:00.000Z",
			summary,
			title,
			upvotes,
		},
		publishedAt,
		summary,
		thumbnail: "https://example.com/thumbnail.png",
		title,
	};
}

export type DailyPapersEntry = ReturnType<typeof dailyPapersEntry>;
