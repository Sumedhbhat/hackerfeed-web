import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

/**
 * End-to-end tests for the web app: user flows and accessibility. They run
 * against the same static demo build as PR previews (real HN and Hugging Face
 * snapshot data), served the same way, with AI chat on and its API faked.
 */
export default defineConfig({
	testDir: "./src",
	fullyParallel: true,
	workers: 2,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [["github"], ["list"]] : "list",
	use: {
		baseURL: `http://127.0.0.1:${PORT}`,
		reducedMotion: "reduce",
		trace: "retain-on-failure",
		// Use a locally installed Chrome instead of Playwright's download.
		launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
			? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH, args: ["--no-sandbox"] }
			: {},
	},
	projects: [
		{
			name: "desktop",
			use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } },
		},
		{
			name: "phone",
			use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true },
		},
	],
	webServer: {
		cwd: "../web",
		command: `bunx vite build && bunx wrangler dev --config wrangler.preview.jsonc --local --ip 127.0.0.1 --port ${PORT}`,
		env: {
			VITE_DEMO_DATA: "true",
			VITE_DEMO_AI_CHAT: "true",
			WRANGLER_SEND_METRICS: "false",
		},
		url: `http://127.0.0.1:${PORT}`,
		reuseExistingServer: !process.env.CI,
		timeout: 240_000,
	},
});
