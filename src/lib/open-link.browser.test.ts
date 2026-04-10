// @vitest-environment happy-dom
/**
 * openLink — centralised external-link utility.
 *
 * Verifies that the abstraction delegates to window.open with the expected
 * arguments and that the call-site API stays stable so future swap-outs
 * (e.g. Capacitor in-app browser) don't inadvertently change visible behavior.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openLink } from "#/lib/open-link";

describe("openLink", () => {
	// biome-ignore lint/suspicious/noExplicitAny: spy types are complex overloads
	let openSpy: ReturnType<typeof vi.spyOn<any, any>>;

	beforeEach(() => {
		openSpy = vi.spyOn(window, "open").mockReturnValue(null);
	});

	afterEach(() => {
		openSpy.mockRestore();
	});

	it("calls window.open with the provided URL", () => {
		openLink("https://example.com/article");

		expect(openSpy).toHaveBeenCalledOnce();
		expect(openSpy).toHaveBeenCalledWith(
			"https://example.com/article",
			"_blank",
			"noopener,noreferrer",
		);
	});

	it("opens in a new tab (_blank target)", () => {
		openLink("https://news.ycombinator.com/item?id=12345");

		const [, target] = openSpy.mock.calls[0];
		expect(target).toBe("_blank");
	});

	it("passes noopener,noreferrer security features", () => {
		openLink("https://example.org");

		const [, , features] = openSpy.mock.calls[0];
		expect(features).toContain("noopener");
		expect(features).toContain("noreferrer");
	});

	it("forwards any URL string unchanged", () => {
		const hnUrl = "https://news.ycombinator.com/item?id=99999";
		openLink(hnUrl);

		const [url] = openSpy.mock.calls[0];
		expect(url).toBe(hnUrl);
	});

	it("can be called multiple times for different URLs", () => {
		openLink("https://first.com");
		openLink("https://second.com");

		expect(openSpy).toHaveBeenCalledTimes(2);
		expect(openSpy.mock.calls[0][0]).toBe("https://first.com");
		expect(openSpy.mock.calls[1][0]).toBe("https://second.com");
	});
});
