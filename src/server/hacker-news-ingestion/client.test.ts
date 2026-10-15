import { describe, expect, it, vi } from "vitest";
import { fetchHackerNewsIngestionSnapshot } from "./client";

function jsonResponse(payload: unknown, status = 200): Response {
	return new Response(JSON.stringify(payload), {
		headers: { "Content-Type": "application/json" },
		status,
	});
}

function requestUrl(input: RequestInfo | URL): URL {
	return new URL(input instanceof Request ? input.url : input.toString());
}

describe("Hacker News ingestion client", () => {
	it("selects, ranks, deduplicates, and fetches each story once", async () => {
		const fetchMock = vi.fn<typeof fetch>(async (input) => {
			const path = requestUrl(input).pathname;
			if (path.endsWith("/topstories.json")) return jsonResponse([3, 1, 3]);
			if (path.endsWith("/newstories.json")) return jsonResponse([1, 2]);
			if (path.endsWith("/beststories.json")) return jsonResponse([3]);
			const id = Number(path.match(/item\/(\d+)/)?.[1]);
			return jsonResponse({ id, type: "story", title: `Story ${id}` });
		});

		const snapshot = await fetchHackerNewsIngestionSnapshot({
			fetch: fetchMock,
			perFeedLimit: 2,
			sleep: vi.fn(async () => undefined),
		});

		expect(snapshot.feedIdCounts).toEqual({ top: 2, new: 2, best: 1 });
		expect(snapshot.uniqueSelectedCount).toBe(3);
		expect(snapshot.stories).toEqual([
			expect.objectContaining({
				story: expect.objectContaining({ id: 3 }),
				ranks: { topRank: 1, newRank: null, bestRank: 1 },
			}),
			expect.objectContaining({
				story: expect.objectContaining({ id: 1 }),
				ranks: { topRank: 2, newRank: 1, bestRank: null },
			}),
			expect.objectContaining({
				story: expect.objectContaining({ id: 2 }),
				ranks: { topRank: null, newRank: 2, bestRank: null },
			}),
		]);
		expect(
			fetchMock.mock.calls.filter(([input]) =>
				requestUrl(input).pathname.includes("/item/"),
			),
		).toHaveLength(3);
	});

	it("preserves dead stories and skips malformed items", async () => {
		const fetchMock = vi.fn<typeof fetch>(async (input) => {
			const path = requestUrl(input).pathname;
			if (path.includes("stories.json")) return jsonResponse([1, 2]);
			if (path.endsWith("/item/1.json")) {
				return jsonResponse({ id: 1, type: "story", dead: true });
			}
			return jsonResponse({ id: 2, type: "comment" });
		});

		const snapshot = await fetchHackerNewsIngestionSnapshot({
			fetch: fetchMock,
			sleep: vi.fn(async () => undefined),
		});

		expect(snapshot.stories).toHaveLength(1);
		expect(snapshot.stories[0]?.story.availabilityStatus).toBe("dead");
		expect(snapshot.skippedCount).toBe(1);
	});

	it("retries transient responses", async () => {
		let topAttempts = 0;
		const fetchMock = vi.fn<typeof fetch>(async (input) => {
			const path = requestUrl(input).pathname;
			if (path.endsWith("/topstories.json")) {
				topAttempts += 1;
				return topAttempts < 3 ? jsonResponse({}, 503) : jsonResponse([]);
			}
			return jsonResponse([]);
		});
		const sleepMock = vi.fn(async () => undefined);

		await fetchHackerNewsIngestionSnapshot({
			fetch: fetchMock,
			sleep: sleepMock,
		});
		expect(topAttempts).toBe(3);
		expect(sleepMock.mock.calls).toEqual([[1_000], [3_000]]);
	});

	it("does not retry non-transient 4xx responses", async () => {
		let topAttempts = 0;
		const fetchMock = vi.fn<typeof fetch>(async (input) => {
			const path = requestUrl(input).pathname;
			if (path.endsWith("/topstories.json")) {
				topAttempts += 1;
				return jsonResponse({}, 400);
			}
			return jsonResponse([]);
		});
		const sleepMock = vi.fn(async () => undefined);

		await expect(
			fetchHackerNewsIngestionSnapshot({ fetch: fetchMock, sleep: sleepMock }),
		).rejects.toThrow("failed with 400");
		expect(topAttempts).toBe(1);
		expect(sleepMock).not.toHaveBeenCalled();
	});

	it("keeps story requests within the configured concurrency", async () => {
		let active = 0;
		let maximumActive = 0;
		const fetchMock = vi.fn<typeof fetch>(async (input) => {
			const path = requestUrl(input).pathname;
			if (path.endsWith("/topstories.json")) return jsonResponse([1, 2, 3, 4]);
			if (path.includes("stories.json")) return jsonResponse([]);

			active += 1;
			maximumActive = Math.max(maximumActive, active);
			await new Promise((resolve) => setTimeout(resolve, 1));
			active -= 1;
			const id = Number(path.match(/item\/(\d+)/)?.[1]);
			return jsonResponse({ id, type: "story" });
		});

		await fetchHackerNewsIngestionSnapshot({
			concurrency: 2,
			fetch: fetchMock,
			sleep: vi.fn(async () => undefined),
		});

		expect(maximumActive).toBe(2);
	});
});
