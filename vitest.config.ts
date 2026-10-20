import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		tsconfigPaths: true,
	},
	test: {
		projects: [
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
