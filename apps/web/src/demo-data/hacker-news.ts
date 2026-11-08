import hackerNewsSnapshot from "./snapshot/hacker-news.json";

export type DemoStory = {
	id: number;
	type: "story";
	by: string;
	time: number;
	score: number;
	title: string;
	descendants: number;
	kids?: number[];
	url?: string;
	text?: string;
};

export type DemoComment = {
	id: number;
	type: "comment";
	by: string;
	time: number;
	parent: number;
	text: string;
	kids?: number[];
};

export type DemoItem = DemoStory | DemoComment;

export type Thread = { story: DemoStory; comments: DemoComment[] };

// The snapshot keeps a sample of each thread; `descendants` is HN's real
// count, so it can be larger than the comments kept here.
const snapshot = hackerNewsSnapshot as {
	feeds: Record<string, number[]>;
	items: DemoItem[];
};

export const items: DemoItem[] = snapshot.items;
export const feeds: Record<string, number[]> = snapshot.feeds;

const byId = new Map(items.map((item) => [item.id, item]));

export const threads: Thread[] = [...new Set(Object.values(feeds).flat())]
	.map((id) => byId.get(id))
	.filter((item): item is DemoStory => item?.type === "story")
	.map((story) => {
		const comments: DemoComment[] = [];
		const collect = (kids: number[] = []) => {
			for (const kid of kids) {
				const comment = byId.get(kid);
				if (comment?.type !== "comment") continue;
				comments.push(comment);
				collect(comment.kids);
			}
		};
		collect(story.kids);
		return { story, comments };
	});
