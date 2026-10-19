import "@tanstack/react-start/server-only";

import type { ServerPlatform } from "./types";

let platform: Promise<ServerPlatform> | undefined;

/**
 * The adapter for the target this build was made for (`DEPLOY_TARGET` in
 * vite.config.ts). The other adapters are dropped from the bundle.
 */
export function getPlatform(): Promise<ServerPlatform> {
	platform ??=
		import.meta.env.DEPLOY_TARGET === "cloudflare"
			? import("./cloudflare").then((module) => module.platform)
			: import("./node").then((module) => module.platform);
	return platform;
}
