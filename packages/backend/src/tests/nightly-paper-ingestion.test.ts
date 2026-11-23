import { asc, eq } from "drizzle-orm";
import { describe, expect, vi } from "vitest";
import {
	hfDailyPaperEntries,
	hfIngestionRuns,
	hfPaperAuthors,
	hfPaperKeywords,
	hfPapers,
} from "../database/schema";
import { fetchHuggingFaceDailyPapersEdition } from "../huggingface-papers/client";
import { getPreviousIndiaEditionDate } from "../huggingface-papers/edition-date";
import { runHuggingFaceDailyPapersIngestion } from "../huggingface-papers/ingestion";
import {
	normalizeKeyword,
	validateHuggingFaceDailyPapersResponse,
} from "../huggingface-papers/schema";
import { dailyPapersEntry } from "./support/data";
import { ingestEdition, nightlyRunFor } from "./support/seed";
import { INTEGRATION, test } from "./support/test";

const EDITION = "2026-06-20";

describe("which edition the nightly job ingests", () => {
	test("the previous India-local calendar date", () => {
		expect(
			getPreviousIndiaEditionDate(new Date("2026-06-12T23:30:00.000Z")),
		).toBe("2026-06-12");
	});

	test("switches at India's midnight, not UTC's", () => {
		expect(
			getPreviousIndiaEditionDate(new Date("2026-01-01T18:29:59.999Z")),
		).toBe("2025-12-31");
		expect(
			getPreviousIndiaEditionDate(new Date("2026-01-01T18:30:00.000Z")),
		).toBe("2026-01-01");
	});
});

describe("a successful nightly run", () => {
	test(
		"asks Hugging Face for one 100-paper edition",
		INTEGRATION,
		async ({ database, huggingFace }) => {
			await ingestEdition({ database, huggingFace }, EDITION);

			expect(huggingFace.requests).toHaveLength(1);
			const [request] = huggingFace.requests;
			expect(request?.url).toBe(
				`https://huggingface.co/api/daily_papers?date=${EDITION}&limit=100&sort=publishedAt`,
			);
			expect(request?.headers.get("accept")).toBe("application/json");
			expect(request?.headers.get("user-agent")).toBe("hackerfeed-web/1.0");
		},
	);

	test(
		"stores the edition and readers can open it",
		INTEGRATION,
		async ({ api, database, huggingFace }) => {
			const result = await ingestEdition({ database, huggingFace }, EDITION, [
				dailyPapersEntry({ arxivId: "2606.00001", title: "First" }),
				dailyPapersEntry({ arxivId: "2606.00002", title: "Second" }),
			]);

			expect(result).toMatchObject({
				editionDate: EDITION,
				fetched: 2,
				papers: 2,
				authors: 2,
				organizations: 1,
				dailyEntries: 2,
			});
			const edition = await api
				.as("user_reader")
				.papers.edition.query({ editionDate: EDITION });
			expect(edition.papers.map((paper) => paper.title)).toEqual([
				"First",
				"Second",
			]);
		},
	);

	test(
		"records the run and its counts",
		INTEGRATION,
		async ({ database, huggingFace }) => {
			const { runId } = await ingestEdition({ database, huggingFace }, EDITION);

			const [run] = await database
				.select()
				.from(hfIngestionRuns)
				.where(eq(hfIngestionRuns.id, runId));
			expect(run).toMatchObject({
				editionDate: EDITION,
				status: "success",
				startedAt: nightlyRunFor(EDITION).toISOString(),
				finishedAt: nightlyRunFor(EDITION).toISOString(),
				sourceUrl: `https://huggingface.co/api/daily_papers?date=${EDITION}&limit=100&sort=publishedAt`,
				fetchedCount: 2,
				upsertedPaperCount: 2,
				upsertedDailyEntryCount: 2,
				errorMessage: null,
			});
		},
	);
});

describe("running the same edition again", () => {
	test(
		"updates papers in place and follows Hugging Face's new order",
		INTEGRATION,
		async ({ api, database, huggingFace }) => {
			await ingestEdition({ database, huggingFace }, EDITION, [
				dailyPapersEntry({ arxivId: "2606.00001", title: "First" }),
				dailyPapersEntry({ arxivId: "2606.00002", title: "Second" }),
			]);
			await ingestEdition({ database, huggingFace }, EDITION, [
				dailyPapersEntry({ arxivId: "2606.00002", title: "Second, revised" }),
				dailyPapersEntry({ arxivId: "2606.00001", title: "First" }),
			]);

			expect(await database.select().from(hfPapers)).toHaveLength(2);
			const edition = await api
				.as("user_reader")
				.papers.edition.query({ editionDate: EDITION });
			expect(edition.papers.map((paper) => paper.title)).toEqual([
				"Second, revised",
				"First",
			]);
		},
	);

	test(
		"replaces a returned paper's authors and keywords and leaves the others alone",
		INTEGRATION,
		async ({ database, huggingFace }) => {
			await ingestEdition({ database, huggingFace }, EDITION, [
				dailyPapersEntry({ arxivId: "2606.00001", keywords: ["Agents"] }),
				dailyPapersEntry({ arxivId: "2606.00002", keywords: ["Robotics"] }),
			]);
			await ingestEdition({ database, huggingFace }, EDITION, [
				dailyPapersEntry({
					arxivId: "2606.00001",
					keywords: ["  Large   Language Models ", "Agents"],
					authors: ["Ada Lovelace", "Grace Hopper"],
				}),
			]);

			const keywords = await database
				.select({
					paperId: hfPaperKeywords.paperId,
					keyword: hfPaperKeywords.keywordNormalized,
				})
				.from(hfPaperKeywords)
				.orderBy(asc(hfPaperKeywords.paperId), asc(hfPaperKeywords.position));
			expect(keywords).toEqual([
				{ paperId: "paper:2606.00001", keyword: "large language models" },
				{ paperId: "paper:2606.00001", keyword: "agents" },
				{ paperId: "paper:2606.00002", keyword: "robotics" },
			]);
			expect(
				await database
					.select()
					.from(hfPaperAuthors)
					.where(eq(hfPaperAuthors.paperId, "paper:2606.00001")),
			).toHaveLength(2);
			expect(
				await database
					.select({ paperId: hfDailyPaperEntries.paperId })
					.from(hfDailyPaperEntries)
					.orderBy(asc(hfDailyPaperEntries.rank)),
			).toEqual([
				{ paperId: "paper:2606.00001" },
				{ paperId: "paper:2606.00002" },
			]);
		},
	);
});

describe("when Hugging Face is unavailable", () => {
	test(
		"retries until it recovers",
		INTEGRATION,
		async ({ database, huggingFace }) => {
			huggingFace.failNext(503, { times: 2 });

			const result = await ingestEdition({ database, huggingFace }, EDITION);

			expect(huggingFace.requests).toHaveLength(3);
			expect(result.fetched).toBe(2);
		},
	);

	test(
		"marks the run failed, keeps the error and stores nothing",
		INTEGRATION,
		async ({ database, huggingFace }) => {
			huggingFace.failNext(503, { times: 3 });

			await expect(
				ingestEdition({ database, huggingFace }, EDITION),
			).rejects.toThrow("Hugging Face Daily Papers request failed with 503");

			expect(await database.select().from(hfIngestionRuns)).toMatchObject([
				{
					status: "failed",
					errorMessage: "Hugging Face Daily Papers request failed with 503",
				},
			]);
			expect(await database.select().from(hfPapers)).toEqual([]);
		},
	);

	test(
		"fails the run on a payload it can't read",
		INTEGRATION,
		async ({ database, huggingFace }) => {
			huggingFace.respondNext(() => Response.json([{ title: "No paper" }]));

			await expect(
				runHuggingFaceDailyPapersIngestion(database, {
					now: () => nightlyRunFor(EDITION),
				}),
			).rejects.toThrow();

			expect(await database.select().from(hfIngestionRuns)).toMatchObject([
				{ status: "failed" },
			]);
			expect(await database.select().from(hfDailyPaperEntries)).toEqual([]);
		},
	);
});

describe("retrying Hugging Face", () => {
	const fetchEdition = (sleep = vi.fn(async (_ms: number) => undefined)) =>
		Object.assign(fetchHuggingFaceDailyPapersEdition("2026-06-19", { sleep }), {
			sleep,
		});

	test.for([429, 500, 503])(
		"backs off 1s then 3s after %s",
		INTEGRATION,
		async (status, { huggingFace }) => {
			huggingFace.failNext(status, { times: 2, retryAfter: null });
			const request = fetchEdition();

			await request;

			expect(huggingFace.requests).toHaveLength(3);
			expect(request.sleep.mock.calls).toEqual([[1_000], [3_000]]);
		},
	);

	test("retries a network error", INTEGRATION, async ({ huggingFace }) => {
		huggingFace.respondNext(() => {
			throw new TypeError("network failure");
		});
		const request = fetchEdition();

		await request;

		expect(huggingFace.requests).toHaveLength(2);
		expect(request.sleep).toHaveBeenCalledWith(1_000);
	});

	test(
		"gives up after three network errors with the last one",
		INTEGRATION,
		async ({ huggingFace }) => {
			const finalError = new TypeError("network unavailable");
			huggingFace.respondNext(
				() => {
					throw new TypeError("connection reset");
				},
				{ times: 2 },
			);
			huggingFace.respondNext(() => {
				throw finalError;
			});
			const request = fetchEdition();

			await expect(request).rejects.toBe(finalError);
			expect(request.sleep.mock.calls).toEqual([[1_000], [3_000]]);
		},
	);

	test(
		"does not retry other 4xx responses",
		INTEGRATION,
		async ({ huggingFace }) => {
			huggingFace.failNext(400);
			const request = fetchEdition();

			await expect(request).rejects.toThrow("failed with 400");
			expect(huggingFace.requests).toHaveLength(1);
			expect(request.sleep).not.toHaveBeenCalled();
		},
	);

	test(
		"does not retry a body that isn't JSON",
		INTEGRATION,
		async ({ huggingFace }) => {
			huggingFace.respondNext(
				() =>
					new Response("not json", {
						headers: { "Content-Type": "application/json" },
					}),
			);
			const request = fetchEdition();

			await expect(request).rejects.toThrow();
			expect(huggingFace.requests).toHaveLength(1);
			expect(request.sleep).not.toHaveBeenCalled();
		},
	);

	test(
		"waits as long as Retry-After asks, up to 30s",
		INTEGRATION,
		async ({ huggingFace }) => {
			huggingFace.failNext(429, { retryAfter: "120" });
			const request = fetchEdition();

			await request;

			expect(request.sleep).toHaveBeenCalledWith(30_000);
		},
	);

	test(
		"reads an HTTP-date Retry-After",
		INTEGRATION,
		async ({ huggingFace }) => {
			vi.spyOn(Date, "now").mockReturnValue(
				Date.parse("2026-06-21T00:00:00.000Z"),
			);
			huggingFace.failNext(503, {
				retryAfter: "Sun, 21 Jun 2026 00:00:05 GMT",
			});
			const request = fetchEdition();

			try {
				await request;
			} finally {
				vi.mocked(Date.now).mockRestore();
			}

			expect(request.sleep).toHaveBeenCalledWith(5_000);
		},
	);

	test(
		"falls back to 1s for a Retry-After it can't read",
		INTEGRATION,
		async ({ huggingFace }) => {
			huggingFace.failNext(429, { retryAfter: "not-a-delay" });
			const request = fetchEdition();

			await request;

			expect(request.sleep).toHaveBeenCalledWith(1_000);
		},
	);

	test.for(["2026-02-29", "2026-04-31", "2026-13-01"])(
		"rejects the impossible date %s without asking",
		INTEGRATION,
		async (invalidDate, { huggingFace }) => {
			await expect(
				fetchHuggingFaceDailyPapersEdition(invalidDate),
			).rejects.toThrow(`Invalid Hugging Face edition date: ${invalidDate}`);
			expect(huggingFace.requests).toEqual([]);
		},
	);
});

describe("reading Hugging Face's payload", () => {
	test("normalizes keywords: trimmed, lower-case, single spaces", () => {
		expect(normalizeKeyword("  Large\t Language\n Models  ")).toBe(
			"large language models",
		);
	});

	test("returns typed entries with ordered authors and keywords", () => {
		const [entry] = validateHuggingFaceDailyPapersResponse([
			dailyPapersEntry({
				arxivId: "2606.12345",
				keywords: ["  Large   Language Models ", "Agents"],
			}),
		]);

		expect(entry).toMatchObject({
			rank: 1,
			entryPublishedAt: "2026-06-19T00:00:00.000Z",
			isAuthorParticipating: true,
			paper: {
				arxivId: "2606.12345",
				authors: [{ hfAuthorId: "author-2606.12345-0", position: 1 }],
				keywords: [
					{
						keywordNormalized: "large language models",
						keywordOriginal: "  Large   Language Models ",
						position: 1,
					},
					{
						keywordNormalized: "agents",
						keywordOriginal: "Agents",
						position: 2,
					},
				],
				organization: { hfOrganizationId: "org-1" },
			},
		});
	});

	test("rejects a malformed payload", () => {
		const entry = dailyPapersEntry();
		expect(() =>
			validateHuggingFaceDailyPapersResponse([
				{ ...entry, paper: { ...entry.paper, authors: null } },
			]),
		).toThrow();
		expect(() => validateHuggingFaceDailyPapersResponse({})).toThrow();
	});

	test.each([
		["collide once normalized", ["AI Agents", "  ai   agents "]],
		["are blank once normalized", [" \t\n "]],
	])("rejects keywords that %s", (_, keywords) => {
		expect(() =>
			validateHuggingFaceDailyPapersResponse([dailyPapersEntry({ keywords })]),
		).toThrow();
	});
});
