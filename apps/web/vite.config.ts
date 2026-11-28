import { cloudflare } from "@cloudflare/vite-plugin";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const demo = process.env.VITE_DEMO_DATA === "true";
// The backend runs in apps/api. The web app may import only its types, through
// entity-state; the demo build also bundles its schema for the in-memory database.
const backendCode = demo
	? /(^|\/)packages\/backend\/(?!src\/database\/schema\.ts$)/
	: /(^|\/)packages\/backend\//;
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;

const config = defineConfig({
	build: {
		sourcemap: sentryAuthToken ? "hidden" : false,
	},
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [
		devtools(),
		!demo && cloudflare({ viteEnvironment: { name: "ssr" } }),

		tailwindcss(),
		tanstackStart({
			...(demo
				? {
						spa: { enabled: true, prerender: { outputPath: "/index" } },
						server: { entry: "demo-server.ts" },
					}
				: {}),
			client: {
				entry: "client-entry.tsx",
			},
			importProtection: {
				include: [/^src\//, /(^|\/)packages\//],
				client: { files: ["**/*.server.*", backendCode] },
				server: { files: ["**/*.client.*", backendCode] },
			},
		}),
		viteReact(),
		sentryVitePlugin({
			org: "sumedhs-org",
			project: "hackerfeed-web",
			authToken: sentryAuthToken,
			disable: !sentryAuthToken,
			telemetry: false,
			sourcemaps: {
				filesToDeleteAfterUpload: ["./dist/**/*.map"],
			},
			release: {
				setCommits: false,
			},
		}),
	],
});

export default config;
