import { test as base, expect } from "@playwright/test";

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
			await use(undefined);
		},
		{ auto: true },
	],
});

export { expect };
