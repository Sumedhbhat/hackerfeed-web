import { z } from "zod";
import { arxivIdSchema } from "#/lib/papers/schemas";

export const paperViewInputSchema = z
	.object({
		arxivId: arxivIdSchema,
	})
	.strict();
