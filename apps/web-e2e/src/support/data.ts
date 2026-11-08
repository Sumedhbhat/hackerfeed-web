import hackerNews from "../../../web/src/demo-data/snapshot/hacker-news.json" with {
	type: "json",
};
import papers from "../../../web/src/demo-data/snapshot/papers.json" with {
	type: "json",
};

type Item = {
	id: number;
	type: string;
	title?: string;
	url?: string;
	kids?: number[];
};

const items = new Map(
	(hackerNews.items as Item[]).map((item) => [item.id, item]),
);
const topStories = hackerNews.feeds.top.map((id) => items.get(id) as Item);

export const threadStory = topStories.find((story) =>
	story.kids?.some((kid) => items.get(kid)?.kids?.length),
) as Item;

export const articleStory = topStories.find(
	(story) => story.url && !/^(Ask|Show) HN:/.test(story.title ?? ""),
) as Item;

export const discussionStory = [...items.values()].find(
	(item) =>
		item.type === "story" &&
		(!item.url || /^(Ask|Show) HN:/.test(item.title ?? "")),
);

export const firstPaper = papers.papers[0];
