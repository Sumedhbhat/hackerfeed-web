import { unixAt } from "./defaults";

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

type StoryFields = Omit<DemoStory, "type" | "descendants" | "kids">;

type CommentFields = Partial<Pick<DemoComment, "by" | "time" | "text">> & {
	id: number;
	replies?: CommentFields[];
};

const COMMENTERS = ["demo_kim", "demo_lee", "demo_max"];

/**
 * A story and its comments. Comment defaults (author, time, text) come from
 * their position; `parent`, `kids` and `descendants` come from the nesting.
 */
export function thread(
	fields: StoryFields,
	topLevel: CommentFields[] = [],
): Thread {
	const comments: DemoComment[] = [];
	const addComments = (
		parent: { id: number; time: number },
		inputs: CommentFields[],
		isReply: boolean,
	): number[] =>
		inputs.map(({ replies = [], ...input }, index) => {
			const comment: DemoComment = {
				type: "comment",
				parent: parent.id,
				by: isReply ? "demo_nia" : COMMENTERS[index % COMMENTERS.length],
				time: isReply ? parent.time + 60 : parent.time - 120 * (index + 1),
				text: isReply
					? "<p>A dummy reply, to show nested threads.</p>"
					: `<p>Dummy comment ${index + 1} on “${fields.title.slice(0, 40)}”. This text exists only for previews.</p>`,
				...input,
			};
			comments.push(comment);
			const kids = addComments(comment, replies, true);
			if (kids.length > 0) comment.kids = kids;
			return comment.id;
		});

	const kids = addComments(fields, topLevel, false);
	return {
		story: {
			type: "story",
			...fields,
			descendants: comments.length,
			...(kids.length > 0 && { kids }),
		},
		comments,
	};
}

export const tinySpreadsheet = thread(
	{
		id: 900001,
		by: "demo_alice",
		score: 420,
		time: unixAt("12:00:00"),
		title: "Show HN: A tiny terminal spreadsheet written in 400 lines",
		url: "https://example.com/tiny-sheet",
	},
	[{ id: 990001, replies: [{ id: 990002 }] }, { id: 990003 }, { id: 990004 }],
);

export const buildCache = thread(
	{
		id: 900002,
		by: "demo_bob",
		score: 395,
		time: unixAt("11:00:00"),
		title: "Why our build got 3x faster after deleting the cache",
		url: "https://example.com/build-cache",
	},
	[{ id: 990005, replies: [{ id: 990006 }] }, { id: 990007 }, { id: 990008 }],
);

export const sideProjects = thread(
	{
		id: 900003,
		by: "demo_carol",
		score: 370,
		time: unixAt("10:00:00"),
		title: "Ask HN: How do you keep side projects maintainable?",
		text: "<p>I keep starting projects and abandoning them after a month. What habits help you keep them healthy?</p>",
	},
	[{ id: 990009, replies: [{ id: 990010 }] }, { id: 990011 }, { id: 990012 }],
);

export const queryPlans = thread(
	{
		id: 900004,
		by: "demo_dave",
		score: 345,
		time: unixAt("09:00:00"),
		title: "A field guide to reading database query plans",
		url: "https://example.com/query-plans",
	},
	[{ id: 990013, replies: [{ id: 990014 }] }, { id: 990015 }, { id: 990016 }],
);

export const serverHtml = thread(
	{
		id: 900005,
		by: "demo_erin",
		score: 320,
		time: unixAt("08:00:00"),
		title: "The quiet return of server-rendered HTML",
		url: "https://example.com/server-html",
	},
	[{ id: 990017, replies: [{ id: 990018 }] }, { id: 990019 }, { id: 990020 }],
);

export const placeholderLabs = thread({
	id: 900006,
	by: "demo_frank",
	score: 295,
	time: unixAt("07:00:00"),
	title: "Launch HN: Placeholder Labs (YC W26) – Mock APIs for staging",
	url: "https://example.com/placeholder-labs",
});

export const threads: Thread[] = [
	tinySpreadsheet,
	buildCache,
	sideProjects,
	queryPlans,
	serverHtml,
	placeholderLabs,
	thread(
		{
			id: 900007,
			by: "demo_alice",
			score: 270,
			time: unixAt("06:00:00"),
			title: "How a 1970s scheduling algorithm still runs your phone",
			url: "https://example.com/scheduler",
		},
		[{ id: 990021 }],
	),
	thread({
		id: 900008,
		by: "demo_grace",
		score: 245,
		time: unixAt("05:00:00"),
		title: "Notes on writing a compiler in a weekend",
		url: "https://example.com/weekend-compiler",
	}),
	thread(
		{
			id: 900009,
			by: "demo_heidi",
			score: 220,
			time: unixAt("04:00:00"),
			title: "Ask HN: What is the most useful script you have written?",
			text: "<p>Mine renames photos by the date they were taken. Curious what small tools others rely on.</p>",
		},
		[{ id: 990022 }],
	),
	thread({
		id: 900010,
		by: "demo_ivan",
		score: 195,
		time: unixAt("03:00:00"),
		title: "Measuring keyboard latency with a high-speed camera",
		url: "https://example.com/keyboard-latency",
	}),
	thread(
		{
			id: 900011,
			by: "demo_judy",
			score: 170,
			time: unixAt("02:00:00"),
			title: "An illustrated introduction to CRDTs",
			url: "https://example.com/crdts",
		},
		[{ id: 990023 }],
	),
	thread({
		id: 900012,
		by: "demo_bob",
		score: 145,
		time: unixAt("01:00:00"),
		title: "We replaced our message queue with a database table",
		url: "https://example.com/db-queue",
	}),
	thread(
		{
			id: 900013,
			by: "demo_mallory",
			score: 120,
			time: unixAt("00:00:00"),
			title: "Show HN: Dummy Weather – a forecast that is always sunny",
			url: "https://example.com/dummy-weather",
		},
		[{ id: 990024 }],
	),
	thread({
		id: 900014,
		by: "demo_carol",
		score: 95,
		time: unixAt("00:00:00") - 3600,
		title: "The surprising physics of pouring coffee",
		url: "https://example.com/coffee-physics",
	}),
	thread(
		{
			id: 900015,
			by: "demo_dave",
			score: 70,
			time: unixAt("00:00:00") - 7200,
			title: "A minimal guide to self-hosting your email",
			url: "https://example.com/self-host-email",
		},
		[{ id: 990025 }],
	),
];

export const items: DemoItem[] = threads.flatMap(({ story, comments }) => [
	story,
	...comments,
]);

const storyIds = (compare: (a: DemoStory, b: DemoStory) => number) =>
	threads
		.map(({ story }) => story)
		.sort(compare)
		.map((story) => story.id);

export const feeds: Record<string, number[]> = {
	top: storyIds((a, b) => b.score - a.score),
	new: storyIds((a, b) => b.time - a.time),
	best: storyIds((a, b) => b.descendants - a.descendants || b.score - a.score),
};
