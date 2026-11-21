import { z } from "zod";

export const readingDaysInputSchema = z
	.object({
		/** Minutes the reader's clock is ahead of UTC, so days end at their midnight. */
		utcOffsetMinutes: z
			.number()
			.int()
			.min(-12 * 60)
			.max(14 * 60),
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
