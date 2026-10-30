import { feeds, items } from "#/demo-data/hacker-news";

/**
 * In-memory stand-in for the Hacker News API, built only into preview builds
 * (VITE_DEMO_DATA=true). Answers the same paths with the dummy data in
 * src/demo-data/hacker-news.ts.
 */
export function fetchDemoHackerNewsJson(path: string): unknown {
	const feed = /^\/(\w+)stories\.json$/.exec(path)?.[1];
	if (feed) return feeds[feed] ?? null;

	const itemId = /^\/item\/(\d+)\.json$/.exec(path)?.[1];
	if (itemId) return items.find((item) => item.id === Number(itemId)) ?? null;

	// The deploy workflows grep builds for this marker.
	throw new Error(`hackerfeed-demo-data has no response for ${path}`);
}
