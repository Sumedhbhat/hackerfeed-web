import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { validateHuggingFaceDailyPapersResponse } from "../../../packages/backend/src/huggingface-papers/schema";
import type { DemoItem } from "../src/demo-data/hacker-news";

const HN = "https://hacker-news.firebaseio.com/v0";
const HF = "https://huggingface.co/api/daily_papers";
const STORIES_PER_FEED = 20;
const TOP_LEVEL_COMMENTS = 4;
const REPLIES_PER_COMMENT = 2;
const PAPERS = 20;
const out = (name: string) =>
	new URL(
		`${process.env.SNAPSHOT_DIR ?? "../src/demo-data/snapshot"}/${name}`,
		import.meta.url,
	);

async function json<T>(url: string): Promise<T> {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
	return response.json() as Promise<T>;
}

type LiveItem = Record<string, unknown> & {
	id: number;
	type: string;
	kids?: number[];
	deleted?: boolean;
	dead?: boolean;
};

async function hackerNews() {
	const feeds: Record<string, number[]> = {};
	for (const feed of ["top", "new", "best"]) {
		feeds[feed] = (await json<number[]>(`${HN}/${feed}stories.json`)).slice(
			0,
			STORIES_PER_FEED,
		);
	}
	const live = new Map<number, LiveItem>();
	const load = async (id: number) => {
		const item = live.get(id) ?? (await json<LiveItem | null>(`${HN}/item/${id}.json`));
		if (item && !item.deleted && !item.dead) live.set(id, item);
		return live.get(id);
	};
	const stories = await Promise.all(
		[...new Set(Object.values(feeds).flat())].map(load),
	);
	for (const story of stories.filter((s) => s && feeds.top.includes(s.id))) {
		const comments = await Promise.all(
			(story?.kids ?? []).slice(0, TOP_LEVEL_COMMENTS).map(load),
		);
		await Promise.all(
			comments.flatMap((comment) =>
				(comment?.kids ?? []).slice(0, REPLIES_PER_COMMENT).map(load),
			),
		);
	}
	for (const feed of Object.keys(feeds)) {
		feeds[feed] = feeds[feed].filter((id) => live.get(id)?.type === "story");
	}
	const pick = (item: LiveItem): DemoItem => {
		const kids = (item.kids ?? []).filter((kid) => live.has(kid));
		const common = {
			id: item.id,
			by: String(item.by ?? "[deleted]"),
			time: Number(item.time),
			...(kids.length > 0 && { kids }),
		};
		return item.type === "story"
			? {
					...common,
					type: "story",
					score: Number(item.score ?? 0),
					title: String(item.title ?? ""),
					descendants: Number(item.descendants ?? 0),
					...(typeof item.url === "string" && { url: item.url }),
					...(typeof item.text === "string" && { text: item.text }),
				}
			: {
					...common,
					type: "comment",
					parent: Number(item.parent),
					text: String(item.text ?? ""),
				};
	};
	const items = [...live.values()]
		.filter((item) => item.type === "story" || item.type === "comment")
		.map(pick);
	return { fetchedAt: new Date().toISOString(), feeds, items };
}

async function papers() {
	for (let daysAgo = 0; daysAgo < 7; daysAgo++) {
		const editionDate = new Date(Date.now() - daysAgo * 86_400_000)
			.toISOString()
			.slice(0, 10);
		const entries = validateHuggingFaceDailyPapersResponse(
			await json(`${HF}?date=${editionDate}&limit=100&sort=publishedAt`),
		);
		if (entries.length === 0) continue;
		const top = entries
			.sort((a, b) => b.paper.upvotes - a.paper.upvotes)
			.slice(0, PAPERS)
			.map(({ entryPublishedAt, isAuthorParticipating, paper }, index) => ({
				rank: index + 1,
				entryPublishedAt,
				isAuthorParticipating,
				arxivId: paper.arxivId,
				title: paper.title,
				summary: paper.summary,
				aiSummary: paper.aiSummary,
				paperPublishedAt: paper.paperPublishedAt,
				upvotes: paper.upvotes,
				projectPage: paper.projectPage,
				githubRepo: paper.githubRepo,
				organization: paper.organization && {
					id: paper.organization.hfOrganizationId,
					name: paper.organization.name,
					fullname: paper.organization.fullname,
				},
				authors: paper.authors
					.filter((author) => !author.hidden)
					.map((author) => author.name),
				keywords: paper.keywords.map((keyword) => keyword.keywordOriginal),
			}));
		return { fetchedAt: new Date().toISOString(), editionDate, papers: top };
	}
	throw new Error("No Hugging Face edition in the last week");
}

const [hn, hf] = await Promise.all([hackerNews(), papers()]);
const files = [out("hacker-news.json"), out("papers.json")];
await writeFile(files[0], JSON.stringify(hn));
await writeFile(files[1], JSON.stringify(hf));
const format = spawnSync(
	"bunx",
	["biome", "format", "--write", ...files.map((file) => file.pathname)],
	{ encoding: "utf8" },
);
if (format.status !== 0) throw new Error(format.stderr);
console.log(
	`${hn.items.length} Hacker News items (${hn.feeds.top.length} top stories), ${hf.papers.length} papers for ${hf.editionDate}`,
);
