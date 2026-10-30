// Compares src/demo-data/hacker-news.ts with the live Hacker News API: reports fields
// the live API returns that no fixture item has, and fields whose type differs.
// Reads live data only to compare shapes; nothing is saved.
// Usage: bun run demo-data:compare
import { items } from "#/demo-data/hacker-news";

const API = "https://hacker-news.firebaseio.com/v0";

type Item = Record<string, unknown> & { type: string };

const typeOf = (value: unknown) =>
	Array.isArray(value) ? "array" : value === null ? "null" : typeof value;

async function get<T>(path: string): Promise<T> {
	const response = await fetch(`${API}${path}`);
	if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
	return response.json() as Promise<T>;
}

async function liveSamples(): Promise<Item[]> {
	const ids = await get<number[]>("/topstories.json");
	const stories = await Promise.all(
		ids.slice(0, 10).map((id) => get<Item>(`/item/${id}.json`)),
	);
	const commentIds = stories.flatMap((story) =>
		((story.kids as number[] | undefined) ?? []).slice(0, 2),
	);
	const comments = await Promise.all(
		commentIds.map((id) => get<Item>(`/item/${id}.json`)),
	);
	return [...stories, ...comments].filter(Boolean);
}

const problems: string[] = [];
for (const live of await liveSamples()) {
	const fixtureItems = (items as unknown as Item[]).filter(
		(item) => item.type === live.type,
	);
	for (const [key, value] of Object.entries(live)) {
		// Live-only flags the app filters out; fixtures never need them.
		if (key === "dead" || key === "deleted") continue;
		const withKey = fixtureItems.filter((item) => key in item);
		if (withKey.length === 0) {
			problems.push(`${live.type}: live field "${key}" (${typeOf(value)}) is in no fixture`);
		} else if (withKey.every((item) => typeOf(item[key]) !== typeOf(value))) {
			problems.push(
				`${live.type}: "${key}" is ${typeOf(value)} live but ${typeOf(withKey[0][key])} in fixtures`,
			);
		}
	}
}

const unique = [...new Set(problems)];
if (unique.length > 0) {
	console.error(unique.join("\n"));
	process.exit(1);
}
console.log("src/demo-data/hacker-news.ts matches the live API's fields and types");
