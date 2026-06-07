import { HackerNewsFeedKey } from "#/lib/hacker-news/queries";

export const feedTabs: Array<{
	key: HackerNewsFeedKey;
	label: string;
	title: string;
}> = [
	{ key: HackerNewsFeedKey.Top, label: "Top", title: "Top stories" },
	{ key: HackerNewsFeedKey.New, label: "New", title: "New stories" },
	{ key: HackerNewsFeedKey.Best, label: "Best", title: "Best stories" },
];
