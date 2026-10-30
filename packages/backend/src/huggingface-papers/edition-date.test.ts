import { describe, expect, it } from "vitest";
import { getPreviousIndiaEditionDate } from "./edition-date";

describe("getPreviousIndiaEditionDate", () => {
	it("returns the previous India-local calendar date", () => {
		expect(
			getPreviousIndiaEditionDate(new Date("2026-06-12T23:30:00.000Z")),
		).toBe("2026-06-12");
	});

	it("uses the India-local date near its midnight boundary", () => {
		expect(
			getPreviousIndiaEditionDate(new Date("2026-01-01T18:29:59.999Z")),
		).toBe("2025-12-31");
		expect(
			getPreviousIndiaEditionDate(new Date("2026-01-01T18:30:00.000Z")),
		).toBe("2026-01-01");
	});
});
