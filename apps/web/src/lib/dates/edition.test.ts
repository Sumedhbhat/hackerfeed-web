import { describe, expect, it } from "vitest";
import { formatEditionDate, formatToday } from "./edition";

describe("edition dates", () => {
	it("formats an edition date without shifting it by time zone", () => {
		expect(formatEditionDate("2026-01-15")).toBe("Thursday 15 January 2026");
	});

	it("returns nothing for a value that isn't a date", () => {
		expect(formatEditionDate("")).toBe("");
		expect(formatEditionDate("not-a-date")).toBe("");
	});

	it("formats the reader's local day", () => {
		expect(formatToday(new Date(2026, 10, 7, 23, 30))).toBe(
			"Saturday 7 November",
		);
	});
});
