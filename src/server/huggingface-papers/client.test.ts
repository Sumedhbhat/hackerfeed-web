import { describe, expect, it, vi } from "vitest";
import { fetchHuggingFaceDailyPapersEdition } from "./client";

const editionDate = "2026-06-19";

function jsonResponse(
	payload: unknown,
	status = 200,
	headers: HeadersInit = {},
): Response {
	return new Response(JSON.stringify(payload), {
		headers: { "Content-Type": "application/json", ...headers },
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
		const [request] = fetchMock.mock.calls[0];
		expect(request).toBeInstanceOf(Request);
		expect((request as Request).url).toBe(
			"https://huggingface.co/api/daily_papers?date=2026-06-19&limit=100&sort=publishedAt",
		);
		expect(Object.fromEntries((request as Request).headers)).toMatchObject({
			accept: "application/json",
			"user-agent": "hackerfeed-web/1.0",
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

	it.each([
		"2026-02-29",
		"2026-04-31",
		"2026-13-01",
	])("rejects invalid calendar date %s before requesting", async (invalidDate) => {
		const fetchMock = vi.fn<typeof fetch>();

		await expect(
			fetchHuggingFaceDailyPapersEdition(invalidDate, { fetch: fetchMock }),
		).rejects.toThrow(`Invalid Hugging Face edition date: ${invalidDate}`);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("honors a bounded Retry-After delay", async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(jsonResponse({}, 429, { "Retry-After": "120" }))
			.mockResolvedValueOnce(jsonResponse([]));
		const sleepMock = vi.fn(async () => undefined);

		await fetchHuggingFaceDailyPapersEdition(editionDate, {
			fetch: fetchMock,
			sleep: sleepMock,
		});

		expect(sleepMock).toHaveBeenCalledWith(30_000);
	});

	it("honors an HTTP-date Retry-After delay", async () => {
		const now = new Date("2026-06-21T00:00:00.000Z");
		const dateNow = vi.spyOn(Date, "now").mockReturnValue(now.getTime());
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				jsonResponse({}, 503, {
					"Retry-After": "Sun, 21 Jun 2026 00:00:05 GMT",
				}),
			)
			.mockResolvedValueOnce(jsonResponse([]));
		const sleepMock = vi.fn(async () => undefined);

		try {
			await fetchHuggingFaceDailyPapersEdition(editionDate, {
				fetch: fetchMock,
				sleep: sleepMock,
			});
		} finally {
			dateNow.mockRestore();
		}

		expect(sleepMock).toHaveBeenCalledWith(5_000);
	});

	it("uses fallback backoff for an invalid Retry-After value", async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				jsonResponse({}, 429, { "Retry-After": "not-a-delay" }),
			)
			.mockResolvedValueOnce(jsonResponse([]));
		const sleepMock = vi.fn(async () => undefined);

		await fetchHuggingFaceDailyPapersEdition(editionDate, {
			fetch: fetchMock,
			sleep: sleepMock,
		});

		expect(sleepMock).toHaveBeenCalledWith(1_000);
	});

	it("stops after three retryable failures", async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(jsonResponse({}, 503));
		const sleepMock = vi.fn(async () => undefined);

		await expect(
			fetchHuggingFaceDailyPapersEdition(editionDate, {
				fetch: fetchMock,
				sleep: sleepMock,
			}),
		).rejects.toThrow("failed with 503");
		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(sleepMock.mock.calls).toEqual([[1_000], [3_000]]);
	});

	it("stops after three network failures and preserves the final error", async () => {
		const finalError = new TypeError("network unavailable");
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockRejectedValueOnce(new TypeError("connection reset"))
			.mockRejectedValueOnce(new TypeError("connection reset"))
			.mockRejectedValueOnce(finalError);
		const sleepMock = vi.fn(async () => undefined);

		await expect(
			fetchHuggingFaceDailyPapersEdition(editionDate, {
				fetch: fetchMock,
				sleep: sleepMock,
			}),
		).rejects.toBe(finalError);
		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(sleepMock.mock.calls).toEqual([[1_000], [3_000]]);
	});

	it("rejects invalid JSON without retrying", async () => {
		const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
			new Response("not json", {
				headers: { "Content-Type": "application/json" },
				status: 200,
			}),
		);
		const sleepMock = vi.fn(async () => undefined);

		await expect(
			fetchHuggingFaceDailyPapersEdition(editionDate, {
				fetch: fetchMock,
				sleep: sleepMock,
			}),
		).rejects.toThrow();
		expect(fetchMock).toHaveBeenCalledOnce();
		expect(sleepMock).not.toHaveBeenCalled();
	});
});
