import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFeatureFlags } from "./feature-flags";

const auth = { getHeaders: async () => ({ Authorization: "Bearer token" }) };

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("fetchFeatureFlags", () => {
	it("sends the session's headers and returns the flags", async () => {
		const fetchMock = vi.fn(async () =>
			Response.json({ flags: { example: true } }),
		);
		vi.stubGlobal("fetch", fetchMock);

		expect(await fetchFeatureFlags(auth)).toEqual({ example: true });
		expect(fetchMock).toHaveBeenCalledWith("/api/feature-flags", {
			headers: { accept: "application/json", Authorization: "Bearer token" },
		});
	});

	it("throws on a failed response", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(null, { status: 503 })),
		);

		await expect(fetchFeatureFlags(auth)).rejects.toThrow("503");
	});
});
