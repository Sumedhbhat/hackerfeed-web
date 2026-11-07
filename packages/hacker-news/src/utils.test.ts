import { describe, expect, it } from "vitest";
import type { HackerNewsStoryRecord } from "./records";
import {
	formatStoryAge,
	getDiscussionUrl,
	getStoryDomain,
	getStoryTitle,
	isDiscussionPost,
	splitPostKind,
	stripHtml,
} from "./utils";

function makeStory(
	overrides: Partial<HackerNewsStoryRecord> = {},
): HackerNewsStoryRecord {
	return {
		by: "testuser",
		descendants: 10,
		id: 12345,
		kids: [],
		score: 100,
		text: null,
		time: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
		title: "Test Story Title",
		type: "story",
		url: "https://example.com/article",
		...overrides,
	};
}

describe("stripHtml", () => {
	it("returns empty string for null input", () => {
		expect(stripHtml(null)).toBe("");
	});

	it("strips basic HTML tags", () => {
		expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
	});

	it("collapses multiple whitespace", () => {
		expect(stripHtml("a  b   c")).toBe("a b c");
	});

	it("returns plain text unchanged", () => {
		expect(stripHtml("plain text")).toBe("plain text");
	});
});

describe("getDiscussionUrl", () => {
	it("returns the correct HN item URL", () => {
		expect(getDiscussionUrl(12345)).toBe(
			"https://news.ycombinator.com/item?id=12345",
		);
	});
});

describe("getStoryDomain", () => {
	it("returns HN domain for null URL", () => {
		expect(getStoryDomain(null)).toBe("news.ycombinator.com");
	});

	it("strips www prefix", () => {
		expect(getStoryDomain("https://www.example.com/article")).toBe(
			"example.com",
		);
	});

	it("returns hostname without path", () => {
		expect(getStoryDomain("https://blog.example.org/post/123")).toBe(
			"blog.example.org",
		);
	});

	it("returns fallback for invalid URL", () => {
		expect(getStoryDomain("not-a-url")).toBe("news.ycombinator.com");
	});
});

describe("getStoryTitle", () => {
	it("returns the story title when present", () => {
		const story = makeStory({ title: "My Title" });
		expect(getStoryTitle(story)).toBe("My Title");
	});

	it("returns fallback for null title", () => {
		const story = makeStory({ title: null });
		expect(getStoryTitle(story)).toBe("Untitled Hacker News story");
	});

	it("returns fallback for empty title", () => {
		const story = makeStory({ title: "   " });
		expect(getStoryTitle(story)).toBe("Untitled Hacker News story");
	});
});

describe("formatStoryAge", () => {
	it("returns 'Fresh' for null time", () => {
		expect(formatStoryAge(null)).toBe("Fresh");
	});

	it("returns 'Just now' for very recent timestamps", () => {
		const now = Math.floor(Date.now() / 1000);
		expect(formatStoryAge(now - 30)).toBe("Just now");
	});

	it("returns a relative time string for older timestamps", () => {
		const twoHoursAgo = Math.floor(Date.now() / 1000) - 7200;
		const result = formatStoryAge(twoHoursAgo);
		expect(result).toContain("hour");
	});
});

describe("splitPostKind", () => {
	it("splits a Show HN / Ask HN prefix from the title", () => {
		expect(splitPostKind("Show HN: A tiny spreadsheet")).toEqual({
			kind: "Show HN",
			text: "A tiny spreadsheet",
		});
		expect(splitPostKind("Ask HN: Why?")).toEqual({
			kind: "Ask HN",
			text: "Why?",
		});
	});

	it("leaves other titles whole", () => {
		expect(splitPostKind("Showing HN data")).toEqual({
			text: "Showing HN data",
		});
		expect(splitPostKind("Show HN:")).toEqual({ text: "Show HN:" });
	});
});

describe("isDiscussionPost", () => {
	it("is true for Ask HN, Show HN and link-less posts, false for articles", () => {
		expect(isDiscussionPost({ title: "Ask HN: Why?", url: null })).toBe(true);
		expect(
			isDiscussionPost({ title: "Show HN: A tool", url: "https://a.example" }),
		).toBe(true);
		expect(isDiscussionPost({ title: "Tell HN: Hello" })).toBe(true);
		expect(
			isDiscussionPost({ title: "A good article", url: "https://a.example" }),
		).toBe(false);
	});
});
