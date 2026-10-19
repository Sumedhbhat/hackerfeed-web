import { fileURLToPath } from "node:url";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import type { DeployTarget } from "./src/platform/types";

const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;

// The one switch between hosts. Each target is a Nitro preset plus an adapter
// in src/platform/.
const deployTarget = (process.env.DEPLOY_TARGET ?? "node") as DeployTarget;
const nitroPresets: Record<DeployTarget, string> = {
	cloudflare: "cloudflare_module",
	node: "node_server",
};
if (!(deployTarget in nitroPresets)) {
	throw new Error(
		`Unknown DEPLOY_TARGET "${deployTarget}". Use one of: ${Object.keys(nitroPresets).join(", ")}`,
	);
}

const config = defineConfig({
	build: {
		sourcemap: sentryAuthToken ? "hidden" : false,
	},
	define: {
		"import.meta.env.DEPLOY_TARGET": JSON.stringify(deployTarget),
	},
	resolve: {
		tsconfigPaths: true,
	},
	environments: {
		// Runtime modules such as `cloudflare:workers`; Nitro bundles for the host.
		ssr: { build: { rolldownOptions: { external: [/^cloudflare:/] } } },
	},
	plugins: [
		devtools(),
		nitro({
			preset: nitroPresets[deployTarget],
			experimental: { tasks: true },
			tasks: {
				"papers:ingest": {
					handler: fileURLToPath(
						new URL(
							"./src/server/huggingface-papers/ingestion-task.ts",
							import.meta.url,
						),
					),
				},
			},
			scheduledTasks: {
				"30 23 * * *": "papers:ingest",
			},
		}),

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
				filesToDeleteAfterUpload: ["./.output/**/*.map"],
			},
			release: {
				setCommits: false,
			},
		}),
	],
});

export default config;
