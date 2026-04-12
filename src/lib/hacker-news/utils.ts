import type { HackerNewsStoryRecord } from "./queries";

const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat("en", {
	numeric: "auto",
});

export function getDiscussionUrl(storyId: number): string {
	return `https://news.ycombinator.com/item?id=${storyId}`;
}

export function stripHtml(input: string | null): string {
	if (!input) {
		return "";
	}

	return input
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function formatStoryAge(unixTime: number | null): string {
	if (!unixTime) {
		return "Fresh";
	}

	const elapsedSeconds = unixTime - Math.floor(Date.now() / 1000);

	if (Math.abs(elapsedSeconds) < 60) {
		return "Just now";
	}

	const minutes = Math.round(elapsedSeconds / 60);
	if (Math.abs(minutes) < 60) {
		return RELATIVE_TIME_FORMATTER.format(minutes, "minute");
	}

	const hours = Math.round(minutes / 60);
	if (Math.abs(hours) < 24) {
		return RELATIVE_TIME_FORMATTER.format(hours, "hour");
	}

	const days = Math.round(hours / 24);
	return RELATIVE_TIME_FORMATTER.format(days, "day");
}

export function getStoryDomain(url: string | null): string {
	if (!url) {
		return "news.ycombinator.com";
	}

	return new URL(url).hostname.replace(/^www\./, "") || "news.ycombinator.com";
}

export function getStoryTitle(story: HackerNewsStoryRecord): string {
	return story.title?.trim() || "Untitled Hacker News story";
}
