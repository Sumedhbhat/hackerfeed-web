import { describe, expect, it, vi } from "vitest";
import { createHttpClient } from "./client";

function stalledFetch() {
	return vi.fn<typeof fetch>((input, init) => {
		const request = input instanceof Request ? input : new Request(input);
		const signal = init?.signal ?? request.signal;

		return new Promise((_resolve, reject) => {
			if (signal.aborted) {
				reject(signal.reason);
				return;
			}

			signal.addEventListener("abort", () => reject(signal.reason), {
				once: true,
			});
		});
	});
}

describe("http", () => {
	it("aborts a stalled request after the configured timeout", async () => {
		const request = createHttpClient({
			fetch: stalledFetch(),
			timeout: 5,
		}).get("https://example.com");

		await expect(request).rejects.toMatchObject({ name: "TimeoutError" });
	});

	it("preserves cancellation supplied by the caller", async () => {
		const controller = new AbortController();
		const request = createHttpClient({ fetch: stalledFetch() }).get(
			"https://example.com",
			{ signal: controller.signal },
		);

		controller.abort(new Error("caller cancelled"));

		await expect(request).rejects.toThrow("caller cancelled");
	});

	it("does not retry requests in the transport layer", async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockRejectedValue(new TypeError("offline"));
		const client = createHttpClient({ fetch: fetchMock });

		await expect(client.get("https://example.com")).rejects.toThrow("offline");
		expect(fetchMock).toHaveBeenCalledOnce();
	});
});
