import type { HackerNewsStoryRecord } from "./queries";

const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat("en", {
	numeric: "auto",
});

export function getDiscussionUrl(storyId: number): string {
	return `https://news.ycombinator.com/item?id=${storyId}`;
}

export function buildChatGptStoryDiscussionUrl(
	story: HackerNewsStoryRecord,
): string {
	const prompt = [
		"I want to discuss this article and understand it completely.",
		`Title: ${getStoryTitle(story)}`,
		story.url ? `Article URL: ${story.url}` : null,
		`Hacker News discussion: ${getDiscussionUrl(story.id)}`,
		"",
		"Please help me understand the core ideas, why they matter, and where they're useful.",
		"I will be asking you a series of questions about this article and want them answered.",
	].filter((line) => line !== null);

	const url = new URL("https://chatgpt.com/");
	url.searchParams.set("q", prompt.join("\n"));

	return url.toString();
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

	try {
		return (
			new URL(url).hostname.replace(/^www\./, "") || "news.ycombinator.com"
		);
	} catch {
		return "news.ycombinator.com";
	}
}

export function getStoryTitle(story: HackerNewsStoryRecord): string {
	return story.title?.trim() || "Untitled Hacker News story";
}
