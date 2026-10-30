import { describe, expect, it } from "vitest";
import { renderServerErrorPage } from "./server-error-page";

describe("renderServerErrorPage", () => {
	it("renders a standalone HTML document with the Trace ID", () => {
		const traceId = "0123456789abcdef0123456789abcdef";
		const html = renderServerErrorPage(traceId);

		expect(html).toMatch(/^<!doctype html><html lang="en">/);
		expect(html).toContain("Trace ID:");
		expect(html).toContain(traceId);
		expect(html).toContain("Try loading the feed again");
		expect(html).not.toContain("<script");
	});

	it("omits the Trace ID row when no trace is available", () => {
		expect(renderServerErrorPage()).not.toContain("Trace ID:");
	});
});
