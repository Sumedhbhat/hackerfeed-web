import { z } from "zod";

export const readingDaysInputSchema = z
	.object({
		timeZone: z
			.string()
			.min(1)
			.max(100)
			.refine((timeZone) => {
				try {
					createReadingDateFormatter(timeZone);
					return true;
				} catch {
					return false;
				}
			}, "Invalid time zone"),
	})
	.strict();
export type ReadingDaysInput = z.infer<typeof readingDaysInputSchema>;

export const readingDaySchema = z.object({
	date: z.iso.date(),
	stories: z.number().int().nonnegative(),
	papers: z.number().int().nonnegative(),
});
export type ReadingDay = z.infer<typeof readingDaySchema>;

/** Every day the reader opened a story or paper, oldest first. */
export const readingDaysOutputSchema = z.array(readingDaySchema);

/** Formats a timestamp as YYYY-MM-DD on the reader's calendar. */
export function createReadingDateFormatter(timeZone: string) {
	return new Intl.DateTimeFormat("sv-SE", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format;
}
