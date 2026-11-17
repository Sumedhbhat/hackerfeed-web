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
