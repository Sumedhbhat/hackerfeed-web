import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] })],
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
			// happy-dom is used in preference to jsdom to avoid a jsdom 28.x
			// CJS/ESM incompatibility with @exodus/bytes on Node 22.
			{
				extends: true,
				test: {
					name: "browser",
					environment: "happy-dom",
					include: [
						"src/components/**/*.test.{ts,tsx}",
						"src/**/*.browser.test.{ts,tsx}",
					],
				},
			},
		],
	},
});
