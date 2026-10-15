import { describe, expect, it } from "vitest";
import {
	normalizeHackerNewsStory,
	normalizeHackerNewsStoryForIngestion,
	normalizeHackerNewsStoryIds,
} from "./schemas";

describe("Hacker News normalization", () => {
	it("deduplicates positive integer story IDs without changing order", () => {
		expect(normalizeHackerNewsStoryIds([3, 1, 3, 0, -2, "4", 2.5, 2])).toEqual([
			3, 1, 4, 2,
		]);
	});

	it.each([
		[{}, "active"],
		[{ dead: true }, "dead"],
		[{ deleted: true }, "deleted"],
	] as const)("preserves the %s story state for ingestion", (flags, status) => {
		expect(
			normalizeHackerNewsStoryForIngestion({
				id: 123,
				type: "story",
				...flags,
			}),
		).toMatchObject({ id: 123, availabilityStatus: status });
	});

	it("keeps dead and deleted stories out of the live feed", () => {
		expect(
			normalizeHackerNewsStory({ id: 123, type: "story", dead: true }),
		).toBeNull();
		expect(
			normalizeHackerNewsStory({ id: 124, type: "story", deleted: true }),
		).toBeNull();
	});

	it.each([null, {}, { id: 0, type: "story" }, { id: 123, type: "comment" }])(
		"skips a missing or malformed story payload",
		(payload) => {
			expect(normalizeHackerNewsStoryForIngestion(payload)).toBeNull();
		},
	);
});
