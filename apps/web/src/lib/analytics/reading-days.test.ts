import type { ReadingDay } from "@hackerfeed/entities/analytics";
import { describe, expect, it } from "vitest";
import {
	addDays,
	MIN_CALENDAR_WEEKS,
	readingCalendar,
	readingSeries,
	readingStreaks,
} from "./reading-days";

const day = (date: string, stories = 1, papers = 0): ReadingDay => ({
	date,
	stories,
	papers,
});

describe("addDays", () => {
	it("crosses months and years", () => {
		expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
		expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
	});
});

describe("readingStreaks", () => {
	const history = [
		day("2026-11-01"),
		day("2026-11-02"),
		day("2026-11-03"),
		day("2026-11-04"),
		day("2026-11-18"),
		day("2026-11-19"),
		day("2026-11-20"),
	];

	it("counts today and the days before it", () => {
		expect(
			readingStreaks([...history, day("2026-11-21")], "2026-11-21"),
		).toEqual({ current: 4, longest: 4, readToday: true });
	});

	it("keeps yesterday's streak alive until today ends", () => {
		expect(readingStreaks(history, "2026-11-21")).toEqual({
			current: 3,
			longest: 4,
			readToday: false,
		});
	});

	it("breaks after a day with no reads", () => {
		expect(readingStreaks(history, "2026-11-22").current).toBe(0);
	});

	it("is zero with no history", () => {
		expect(readingStreaks([], "2026-11-21")).toEqual({
			current: 0,
			longest: 0,
			readToday: false,
		});
	});
});

describe("readingSeries", () => {
	it("fills the days without reads and ends today", () => {
		expect(
			readingSeries(
				[day("2026-11-01"), day("2026-11-19", 2, 1)],
				"2026-11-21",
				3,
			),
		).toEqual([
			day("2026-11-19", 2, 1),
			day("2026-11-20", 0),
			day("2026-11-21", 0),
		]);
	});

	it("starts at the first day with reads", () => {
		expect(
			readingSeries([day("2026-11-20")], "2026-11-21", 30).map(
				(entry) => entry.date,
			),
		).toEqual(["2026-11-20", "2026-11-21"]);
	});

	it("is empty with no history", () => {
		expect(readingSeries([], "2026-11-21", 7)).toEqual([]);
	});
});

describe("readingCalendar", () => {
	it("ends with today's week, Sunday first, blank after today and before the first read", () => {
		const weeks = readingCalendar(
			[day("2026-11-17"), day("2026-11-20", 3)],
			"2026-11-21",
		);

		expect(weeks).toHaveLength(MIN_CALENDAR_WEEKS);
		expect(weeks.at(-1)?.map((cell) => cell.reading?.date ?? null)).toEqual([
			null,
			null,
			"2026-11-17",
			"2026-11-18",
			"2026-11-19",
			"2026-11-20",
			"2026-11-21",
		]);
		expect(weeks.at(-1)?.[5]?.reading).toEqual(day("2026-11-20", 3));
		expect(weeks.at(-1)?.[6]?.reading).toEqual(day("2026-11-21", 0));
		expect(weeks[0]?.every((cell) => cell.reading === null)).toBe(true);
	});

	it("covers at most a year", () => {
		const weeks = readingCalendar([day("2020-01-01")], "2026-11-21");

		expect(weeks).toHaveLength(53);
		expect(weeks[0]?.[0]?.reading).toEqual(day("2025-11-16", 0));
	});
});
