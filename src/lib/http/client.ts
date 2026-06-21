import ky, { type Options } from "ky";

export const DEFAULT_HTTP_TIMEOUT_MS = 10_000;

type HttpClientOptions = Pick<Options, "fetch" | "timeout">;

export function createHttpClient(options: HttpClientOptions = {}) {
	return ky.create({
		retry: 0,
		throwHttpErrors: false,
		timeout: DEFAULT_HTTP_TIMEOUT_MS,
		...options,
	});
}

export const http = createHttpClient();
