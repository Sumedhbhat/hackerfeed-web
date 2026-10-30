import { cloudflare } from "@cloudflare/vite-plugin";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const demo = process.env.VITE_DEMO_DATA === "true";
// The browser may import only the backend's types; the demo build also bundles
// its schema for the in-memory database.
const backendInBrowser = demo
	? /(^|\/)packages\/backend\/(?!src\/(api-types|database\/schema)\.ts$)/
	: /(^|\/)packages\/backend\/(?!src\/api-types\.ts$)/;
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const { D1_DATABASE_ID, D1_DATABASE_NAME } = process.env;
if (!D1_DATABASE_ID !== !D1_DATABASE_NAME) {
	throw new Error("Set both D1_DATABASE_ID and D1_DATABASE_NAME, or neither");
}

const config = defineConfig({
	build: {
		sourcemap: sentryAuthToken ? "hidden" : false,
	},
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [
		devtools(),
		!demo &&
			cloudflare({
				viteEnvironment: { name: "ssr" },
				config: (worker) => {
					if (!D1_DATABASE_ID || !D1_DATABASE_NAME) return;
					for (const database of worker.d1_databases) {
						if (database.binding === "DB") {
							database.database_id = D1_DATABASE_ID;
							database.database_name = D1_DATABASE_NAME;
						}
					}
				},
			}),

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
				client: { files: ["**/*.server.*", backendInBrowser] },
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
