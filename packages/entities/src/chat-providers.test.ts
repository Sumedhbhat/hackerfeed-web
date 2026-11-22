import { describe, expect, it } from "vitest";
import { buildChatUrl, chatProviderIdSchema } from "./chat-providers";

describe("buildChatUrl", () => {
	it.each(chatProviderIdSchema.options)(
		"puts the prompt in %s's q parameter",
		(provider) => {
			const url = new URL(buildChatUrl(provider, "Explain\nthis"));
			expect(url.protocol).toBe("https:");
			expect(url.searchParams.get("q")).toBe("Explain\nthis");
		},
	);
});
