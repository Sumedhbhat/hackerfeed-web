import "@tanstack/react-start/server-only";
import type { HuggingFaceDailyPaper } from "./schema";
import { validateHuggingFaceDailyPapersResponse } from "./schema";

const DAILY_PAPERS_URL = "https://huggingface.co/api/daily_papers";
const RETRY_DELAYS_MS = [1_000, 3_000] as const;
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

export async function fetchHuggingFaceDailyPapersEdition(
	editionDate: string,
	options: FetchOptions = {},
): Promise<HuggingFaceDailyPaper[]> {
	if (!editionDatePattern.test(editionDate)) {
		throw new Error(`Invalid Hugging Face edition date: ${editionDate}`);
	}

	const fetchImpl = options.fetch ?? fetch;
	const sleepImpl = options.sleep ?? sleep;
	const url = new URL(DAILY_PAPERS_URL);
	url.searchParams.set("date", editionDate);
	url.searchParams.set("limit", "100");
	url.searchParams.set("sort", "publishedAt");

	for (let attempt = 0; attempt < 3; attempt += 1) {
		let response: Response;
		try {
			response = await fetchImpl(url, {
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

		await sleepImpl(RETRY_DELAYS_MS[attempt]);
	}

	throw new Error("Hugging Face Daily Papers retry loop exhausted");
}
