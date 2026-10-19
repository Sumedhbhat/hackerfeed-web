import "@tanstack/react-start/server-only";

import { env, waitUntil } from "cloudflare:workers";
import * as Sentry from "@sentry/cloudflare";
import { createD1Database, type D1DatabaseBinding } from "./d1";
import { getSentryServerOptions } from "./sentry-options";
import type { ServerPlatform } from "./types";

/**
 * Cloudflare Workers: D1 bound as `DB`, Sentry through `@sentry/cloudflare`.
 * The Worker, its D1 database and the cron trigger are declared in the
 * infrastructure code, not here.
 */
const workerEnv = env as Record<string, string | undefined> & {
	DB: D1DatabaseBinding;
};
const context = { waitUntil, passThroughOnException() {} };

function trace(request: Request, handle: () => Promise<Response>) {
	const options = getSentryServerOptions(workerEnv);
	if (!options) return handle();

	return Sentry.wrapRequestHandler({ options, request, context }, handle);
}

export const platform: ServerPlatform = {
	openDatabase() {
		return createD1Database(Sentry.instrumentD1WithSentry(workerEnv.DB));
	},
	traceRequest: trace,
	async traceTask(name, run) {
		// @sentry/cloudflare only scopes fetch-shaped work, so a job is traced
		// as a request to its name.
		let result: Awaited<ReturnType<typeof run>> | undefined;
		await trace(new Request(`https://tasks.internal/${name}`), async () => {
			result = await run();
			return new Response(null, { status: 204 });
		});
		return result as Awaited<ReturnType<typeof run>>;
	},
};
