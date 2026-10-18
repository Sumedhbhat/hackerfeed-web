import { cloudflare } from "@cloudflare/vite-plugin";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

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
		cloudflare({ viteEnvironment: { name: "ssr" } }),

		tailwindcss(),
		tanstackStart({
			client: {
				entry: "client-entry.tsx",
			},
		}),
		viteReact({
			babel: {
				plugins: ["babel-plugin-react-compiler"],
			},
		}),
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
