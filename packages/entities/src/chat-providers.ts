import { z } from "zod";

export const chatProviderIdSchema = z.enum([
	"chatgpt",
	"claude",
	"perplexity",
	"grok",
]);
export type ChatProviderId = z.infer<typeof chatProviderIdSchema>;

/** `promptUrl` opens a new chat with `?q=` already typed in. */
export const CHAT_PROVIDERS: Record<
	ChatProviderId,
	{ name: string; promptUrl: string }
> = {
	chatgpt: { name: "ChatGPT", promptUrl: "https://chatgpt.com/" },
	claude: { name: "Claude", promptUrl: "https://claude.ai/new" },
	perplexity: {
		name: "Perplexity",
		promptUrl: "https://www.perplexity.ai/search",
	},
	grok: { name: "Grok", promptUrl: "https://grok.com/" },
};

export const DEFAULT_CHAT_PROVIDER: ChatProviderId = "chatgpt";

export function buildChatUrl(provider: ChatProviderId, prompt: string): string {
	const url = new URL(CHAT_PROVIDERS[provider].promptUrl);
	url.searchParams.set("q", prompt);
	return url.toString();
}
