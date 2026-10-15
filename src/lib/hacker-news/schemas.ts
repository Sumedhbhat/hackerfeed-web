export enum HackerNewsFeedKey {
	Top = "top",
	New = "new",
	Best = "best",
}

export type HackerNewsAvailabilityStatus = "active" | "dead" | "deleted";

export type HackerNewsStoryRecord = {
	by: string | null;
	descendants: number;
	id: number;
	kids: number[];
	score: number;
	text: string | null;
	time: number | null;
	title: string | null;
	type: "story";
	url: string | null;
};

export type HackerNewsIngestionStory = {
	availabilityStatus: HackerNewsAvailabilityStatus;
	by: string | null;
	descendants: number | null;
	id: number;
	kids: number[] | null;
	score: number | null;
	text: string | null;
	time: number | null;
	title: string | null;
	type: "story";
	url: string | null;
};

export type HackerNewsCommentRecord = {
	id: number;
	by: string | null;
	text: string | null;
	time: number | null;
	kids: number[];
	parent: number;
	type: "comment";
	deleted: boolean;
	dead: boolean;
};

export type HackerNewsItemResponse = {
	by?: string;
	dead?: boolean;
	deleted?: boolean;
	descendants?: number;
	id?: number;
	kids?: number[];
	parent?: number;
	score?: number;
	text?: string;
	time?: number;
	title?: string;
	type?: string;
	url?: string;
};

function positiveInteger(value: unknown): number | null {
	return typeof value === "number" && Number.isInteger(value) && value > 0
		? value
		: null;
}

function integerOrZero(value: unknown): number {
	return typeof value === "number" && Number.isInteger(value) ? value : 0;
}

function optionalInteger(value: unknown): number | null {
	return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function childIds(value: unknown): number[] {
	return Array.isArray(value)
		? value.filter(
				(id): id is number =>
					typeof id === "number" && Number.isInteger(id) && id > 0,
			)
		: [];
}

export function normalizeHackerNewsStoryForIngestion(
	payload: HackerNewsItemResponse | null,
): HackerNewsIngestionStory | null {
	if (payload?.type !== "story") return null;

	const id = positiveInteger(payload.id);
	if (id === null) return null;

	const availabilityStatus: HackerNewsAvailabilityStatus = payload.deleted
		? "deleted"
		: payload.dead
			? "dead"
			: "active";
	const preserveMissingMetadata = availabilityStatus !== "active";

	return {
		availabilityStatus,
		by: payload.by ?? null,
		descendants: preserveMissingMetadata
			? optionalInteger(payload.descendants)
			: integerOrZero(payload.descendants),
		id,
		kids:
			preserveMissingMetadata && !Array.isArray(payload.kids)
				? null
				: childIds(payload.kids),
		score: preserveMissingMetadata
			? optionalInteger(payload.score)
			: integerOrZero(payload.score),
		text: payload.text ?? null,
		time:
			typeof payload.time === "number" && Number.isInteger(payload.time)
				? payload.time
				: null,
		title: payload.title ?? null,
		type: "story",
		url: payload.url ?? null,
	};
}

export function normalizeHackerNewsStory(
	payload: HackerNewsItemResponse | null,
): HackerNewsStoryRecord | null {
	const story = normalizeHackerNewsStoryForIngestion(payload);
	if (story?.availabilityStatus !== "active") return null;

	return {
		by: story.by,
		descendants: story.descendants ?? 0,
		id: story.id,
		kids: story.kids ?? [],
		score: story.score ?? 0,
		text: story.text,
		time: story.time,
		title: story.title,
		type: "story",
		url: story.url,
	};
}

export function normalizeHackerNewsComment(
	payload: HackerNewsItemResponse | null,
): HackerNewsCommentRecord | null {
	if (payload?.type !== "comment") return null;

	const id = positiveInteger(payload.id);
	const parent = positiveInteger(payload.parent);
	if (id === null || parent === null) return null;

	return {
		id,
		by: payload.by ?? null,
		text: payload.text ?? null,
		time: typeof payload.time === "number" ? payload.time : null,
		kids: childIds(payload.kids),
		parent,
		type: "comment",
		deleted: payload.deleted ?? false,
		dead: payload.dead ?? false,
	};
}

export function normalizeHackerNewsStoryIds(payload: unknown): number[] {
	if (!Array.isArray(payload)) return [];

	const ids: number[] = [];
	const seen = new Set<number>();
	for (const value of payload) {
		const id = positiveInteger(Number(value));
		if (id === null || seen.has(id)) continue;
		seen.add(id);
		ids.push(id);
	}
	return ids;
}
