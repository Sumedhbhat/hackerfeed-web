import { describe, expect, it } from "vitest";
import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";
import {
	formatStoryAge,
	getDiscussionUrl,
	getStoryDomain,
	getStorySummary,
	getStoryTitle,
	stripHtml,
} from "#/lib/hacker-news/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// stripHtml
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// getDiscussionUrl
// ---------------------------------------------------------------------------

describe("getDiscussionUrl", () => {
	it("returns the correct HN item URL", () => {
		expect(getDiscussionUrl(12345)).toBe(
			"https://news.ycombinator.com/item?id=12345",
		);
	});
});

// ---------------------------------------------------------------------------
// getStoryDomain
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// getStoryTitle
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// getStorySummary
// ---------------------------------------------------------------------------

describe("getStorySummary", () => {
	it("returns text preview when story has text", () => {
		const story = makeStory({ text: "<p>Some story body text here.</p>" });
		expect(getStorySummary(story)).toBe("Some story body text here.");
	});

	it("returns article fallback when no text but has URL", () => {
		const story = makeStory({ text: null, url: "https://example.com" });
		expect(getStorySummary(story)).toContain("article");
	});

	it("returns discussion fallback for URL-less posts", () => {
		const story = makeStory({ text: null, url: null });
		expect(getStorySummary(story)).toContain("Hacker News");
	});
});

// ---------------------------------------------------------------------------
// formatStoryAge
// ---------------------------------------------------------------------------

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
