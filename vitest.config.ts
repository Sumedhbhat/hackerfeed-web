import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		tsconfigPaths: true,
	},
	test: {
		projects: [
			// Pure utility / store tests — no DOM needed.
			{
				extends: true,
				test: {
					name: "node",
					environment: "node",
					include: ["src/**/*.test.{ts,tsx}"],
					exclude: [
						"src/components/**",
						"src/**/*.browser.test.{ts,tsx}",
					],
				},
			},
			// Component and browser-API tests — use happy-dom.
			{
				extends: true,
				test: {
					name: "browser",
					environment: "happy-dom",
					setupFiles: ["./vitest.browser.setup.ts"],
					include: [
						"src/components/**/*.test.{ts,tsx}",
						"src/**/*.browser.test.{ts,tsx}",
					],
				},
			},
		],
	},
});
