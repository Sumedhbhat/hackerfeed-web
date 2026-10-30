import "@tanstack/react-start/server-only";
import { http } from "#/lib/http/client";
import type { HuggingFaceDailyPaper } from "./schema";
import { validateHuggingFaceDailyPapersResponse } from "./schema";

const DAILY_PAPERS_URL = "https://huggingface.co/api/daily_papers";
const RETRY_DELAYS_MS = [1_000, 3_000] as const;
const MAX_RETRY_DELAY_MS = 30_000;
const editionDatePattern = /^\d{4}-\d{2}-\d{2}$/;

type FetchOptions = {
	fetch?: typeof fetch;
	sleep?: (milliseconds: number) => Promise<void>;
};

function sleep(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isRetryableStatus(status: number): boolean {
	return status === 429 || status >= 500;
}

function isValidEditionDate(value: string): boolean {
	if (!editionDatePattern.test(value)) {
		return false;
	}

	const date = new Date(`${value}T00:00:00.000Z`);
	return (
		!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
	);
}

function retryDelay(response: Response, fallbackMilliseconds: number): number {
	const retryAfter = response.headers.get("Retry-After");
	if (retryAfter === null) {
		return fallbackMilliseconds;
	}

	const seconds = /^\d+$/.test(retryAfter) ? Number(retryAfter) : null;
	const requestedMilliseconds =
		seconds === null ? Date.parse(retryAfter) - Date.now() : seconds * 1_000;

	if (!Number.isFinite(requestedMilliseconds) || requestedMilliseconds < 0) {
		return fallbackMilliseconds;
	}

	return Math.min(requestedMilliseconds, MAX_RETRY_DELAY_MS);
}

export async function fetchHuggingFaceDailyPapersEdition(
	editionDate: string,
	options: FetchOptions = {},
): Promise<HuggingFaceDailyPaper[]> {
	if (!isValidEditionDate(editionDate)) {
		throw new Error(`Invalid Hugging Face edition date: ${editionDate}`);
	}

	const sleepImpl = options.sleep ?? sleep;
	const url = new URL(DAILY_PAPERS_URL);
	url.searchParams.set("date", editionDate);
	url.searchParams.set("limit", "100");
	url.searchParams.set("sort", "publishedAt");

	for (let attempt = 0; attempt < 3; attempt += 1) {
		let response: Response;
		try {
			response = await http.get(url, {
				fetch: options.fetch,
				headers: {
					Accept: "application/json",
					"User-Agent": "hackerfeed-web/1.0",
				},
			});
		} catch (error) {
			if (attempt === 2) {
				throw error;
			}
			await sleepImpl(RETRY_DELAYS_MS[attempt]);
			continue;
		}

		if (response.ok) {
			return validateHuggingFaceDailyPapersResponse(await response.json());
		}

		if (!isRetryableStatus(response.status) || attempt === 2) {
			throw new Error(
				`Hugging Face Daily Papers request failed with ${response.status}`,
			);
		}

		await sleepImpl(retryDelay(response, RETRY_DELAYS_MS[attempt]));
	}

	throw new Error("Hugging Face Daily Papers retry loop exhausted");
}
