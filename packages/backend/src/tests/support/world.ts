import type {
	PaletteInput,
	PreferencesUpdateInput,
} from "@hackerfeed/entities/appearance";
import type { HackerNewsStoryRecord } from "@hackerfeed/entities/hacker-news";
import type { DatabaseContext } from "../../database/client";
import type { TestApi } from "./api";
import { type DailyPapersEntry, hnStory } from "./data";
import {
	type createFakeHuggingFace,
	DEFAULT_EDITION,
} from "./external-services";
import { appUserIdOf, ingestEdition } from "./seed";

export const WORLD_EDITION_DATE = "2026-06-20";

export const WORLD_STORIES = [
	hnStory({
		id: 101,
		by: "pg",
		title: "Show HN: A tiny database",
		url: "https://example.com/tiny-db",
	}),
	hnStory({
		id: 102,
		by: "dang",
		title: "Ask HN: What are you reading?",
		url: null,
	}),
	hnStory({
		id: 103,
		by: "tptacek",
		title: "A history of TLS",
		url: "https://example.com/tls",
	}),
];

export const SUNSET: PaletteInput = {
	name: "Sunset",
	baseRole: "background",
	baseColor: "#FFF6D5",
	accentColor: "#7C3AED",
};

/** What a reader has done before the test starts, all through the API. */
export type ReaderSeed = {
	savedStories: number[];
	savedPapers: string[];
	readStories: number[];
	readPapers: string[];
	/** Created and picked as the reader's palette. */
	palette: PaletteInput | null;
	preferences: PreferencesUpdateInput;
};

const NEW_READER: ReaderSeed = {
	savedStories: [],
	savedPapers: [],
	readStories: [],
	readPapers: [],
	palette: null,
	preferences: {},
};

const DEFAULT_READERS = {
	alice: {
		savedStories: [101, 102],
		savedPapers: ["2606.00001"],
		readStories: [101],
		readPapers: ["2606.00001"],
		palette: SUNSET,
		preferences: { mode: "dark", chatProvider: "claude" },
	},
	bob: {
		savedStories: [102, 103],
		savedPapers: ["2606.00002"],
		readStories: [103],
		readPapers: [],
		palette: null,
		preferences: { mode: "light", paletteId: "ember" },
	},
} satisfies Record<string, ReaderSeed>;

type DefaultReader = keyof typeof DEFAULT_READERS;

export type WorldOptions<Extra extends string> = {
	stories?: HackerNewsStoryRecord[];
	papers?: DailyPapersEntry[];
	/** Changes to alice and bob, or new readers, who start with nothing. */
	readers?: Record<Extra, Partial<ReaderSeed>>;
};

export type WorldReader = ReaderSeed & {
	workosUserId: string;
	appUserId: string;
	client: ReturnType<TestApi["as"]>;
	paletteId: string | null;
};

export type World<Extra extends string = never> = {
	stories: HackerNewsStoryRecord[];
	papers: DailyPapersEntry[];
} & Record<DefaultReader | Extra, WorldReader>;

/**
 * A small, realistic database: today's papers ingested by the nightly job,
 * and two readers, alice and bob, who saved and read some of the shared
 * stories and papers (both saved story 102) and chose their own appearance.
 * Stories reach the database as in production, when a reader saves or reads one.
 */
export async function seedWorld<Extra extends string = never>(
	services: {
		api: TestApi;
		database: DatabaseContext;
		huggingFace: ReturnType<typeof createFakeHuggingFace>;
	},
	{
		stories = WORLD_STORIES,
		papers = DEFAULT_EDITION,
		readers: changes,
	}: WorldOptions<Extra> = {},
): Promise<World<Extra>> {
	await ingestEdition(services, WORLD_EDITION_DATE, papers);
	const storyById = new Map(stories.map((story) => [story.id, story]));
	const story = (id: number) => {
		const found = storyById.get(id);
		if (!found) throw new Error(`Story ${id} is not in the world`);
		return found;
	};

	const seeds: Record<string, ReaderSeed> = { ...DEFAULT_READERS };
	for (const [name, change] of Object.entries<Partial<ReaderSeed>>(
		changes ?? ({} as Record<Extra, Partial<ReaderSeed>>),
	)) {
		seeds[name] = { ...(seeds[name] ?? NEW_READER), ...change };
	}

	async function seedReader(name: string, seed: ReaderSeed) {
		const workosUserId = `user_${name}`;
		const client = services.api.as(workosUserId);
		for (const id of seed.savedStories) {
			await client.favorites.add.mutate(story(id));
		}
		for (const arxivId of seed.savedPapers) {
			await client.paperFavorites.add.mutate({ arxivId });
		}
		for (const id of seed.readStories) {
			await client.views.story.mutate({ action: "read", story: story(id) });
		}
		for (const arxivId of seed.readPapers) {
			await client.views.paper.mutate({ action: "read", arxivId });
		}
		const paletteId = seed.palette
			? (await client.palettes.create.mutate(seed.palette)).id
			: null;
		const preferences = paletteId
			? { ...seed.preferences, paletteId }
			: seed.preferences;
		if (Object.keys(preferences).length > 0) {
			await client.preferences.update.mutate(preferences);
		}
		const reader: WorldReader = {
			...seed,
			workosUserId,
			appUserId: await appUserIdOf(services.database, workosUserId),
			client,
			paletteId,
		};
		return [name, reader] as const;
	}

	const readers = await Promise.all(
		Object.entries(seeds).map(([name, seed]) => seedReader(name, seed)),
	);
	return { stories, papers, ...Object.fromEntries(readers) } as World<Extra>;
}
