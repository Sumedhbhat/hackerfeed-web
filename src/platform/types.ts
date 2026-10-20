import type { DatabaseContext } from "#/server/database/client";

/**
 * What the app needs from the place it runs. Each deploy target in
 * `src/platform/<target>.ts` implements it; nothing else in `src/` knows which
 * target it is on.
 */
export type ServerPlatform = {
	openDatabase(): Promise<DatabaseContext>;
	/** Runs one request inside the target's Sentry request scope. */
	traceRequest(
		request: Request,
		handle: () => Promise<Response>,
	): Promise<Response>;
	/** Runs one scheduled job inside the target's Sentry scope. */
	traceTask<T>(name: string, run: () => Promise<T>): Promise<T>;
};

export type DeployTarget = "cloudflare" | "node";
