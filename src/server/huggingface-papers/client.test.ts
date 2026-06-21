import { describe, expect, it, vi } from "vitest";
import { fetchHuggingFaceDailyPapersEdition } from "./client";

const editionDate = "2026-06-19";

function jsonResponse(payload: unknown, status = 200): Response {
	return new Response(JSON.stringify(payload), {
		headers: { "Content-Type": "application/json" },
		status,
	});
}

describe("fetchHuggingFaceDailyPapersEdition", () => {
	it("requests exactly one 100-paper edition with the required headers", async () => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse([]));

		await expect(
			fetchHuggingFaceDailyPapersEdition(editionDate, { fetch: fetchMock }),
		).resolves.toEqual([]);

		expect(fetchMock).toHaveBeenCalledOnce();
		const [url, init] = fetchMock.mock.calls[0];
		expect(String(url)).toBe(
			"https://huggingface.co/api/daily_papers?date=2026-06-19&limit=100&sort=publishedAt",
		);
		expect(init?.headers).toEqual({
			Accept: "application/json",
			"User-Agent": "hackerfeed-web/1.0",
		});
	});

	it.each([
		429, 500, 503,
	])("retries status %s with 1s and 3s backoff", async (status) => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(jsonResponse({}, status))
			.mockResolvedValueOnce(jsonResponse({}, status))
			.mockResolvedValueOnce(jsonResponse([]));
		const sleepMock = vi.fn(async () => undefined);

		await fetchHuggingFaceDailyPapersEdition(editionDate, {
			fetch: fetchMock,
			sleep: sleepMock,
		});

		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(sleepMock.mock.calls).toEqual([[1_000], [3_000]]);
	});

	it("retries network errors", async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockRejectedValueOnce(new TypeError("network failure"))
			.mockResolvedValue(jsonResponse([]));
		const sleepMock = vi.fn(async () => undefined);

		await fetchHuggingFaceDailyPapersEdition(editionDate, {
			fetch: fetchMock,
			sleep: sleepMock,
		});

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(sleepMock).toHaveBeenCalledWith(1_000);
	});

	it("does not retry other 4xx responses", async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(jsonResponse({}, 400));
		const sleepMock = vi.fn(async () => undefined);

		await expect(
			fetchHuggingFaceDailyPapersEdition(editionDate, {
				fetch: fetchMock,
				sleep: sleepMock,
			}),
		).rejects.toThrow("failed with 400");
		expect(fetchMock).toHaveBeenCalledOnce();
		expect(sleepMock).not.toHaveBeenCalled();
	});
});
