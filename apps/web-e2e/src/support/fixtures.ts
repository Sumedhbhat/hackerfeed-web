import { test as base, expect } from "@playwright/test";

const REPLY = [
	"It comes down to two choices.",
	"",
	"1. **Cheap hardware** with a full Linux userland.",
	"2. **A small footprint**, so it fits where a PC would not.",
	"",
	"```",
	`${"x".repeat(160)}`,
	"```",
].join("\n");

export const test = base.extend<{ stubbedNetwork: undefined }>({
	stubbedNetwork: [
		async ({ context, baseURL }, use) => {
			await context.route(
				(url) => !url.href.startsWith(baseURL ?? ""),
				(route) =>
					route.fulfill({
						contentType: "text/html",
						body: "<title>external</title>",
					}),
			);
			await context.route("**/api/ai/providers", (route) =>
				route.fulfill({
					json: {
						providers: [
							{
								id: "openai",
								name: "ChatGPT",
								description: "Use your ChatGPT plan.",
								manageUrl: "https://chatgpt.com",
								canConnect: true,
								connected: true,
								account: { email: "demo@example.com", name: "Demo Reader" },
							},
						],
					},
				}),
			);
			await context.route("**/api/ai/providers/*/models", (route) =>
				route.fulfill({
					json: { models: [{ slug: "gpt-5", displayName: "GPT-5" }] },
				}),
			);
			await context.route("**/api/ai/chat", (route) =>
				route.fulfill({
					contentType: "application/x-ndjson",
					body: `${JSON.stringify({ type: "delta", text: REPLY })}\n${JSON.stringify({ type: "done" })}\n`,
				}),
			);
			await use(undefined);
		},
		{ auto: true },
	],
});

export { expect };
