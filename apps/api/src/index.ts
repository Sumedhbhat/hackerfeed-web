import { createBackend } from "@hackerfeed/backend";
import {
	createDatabaseContext,
	type D1DatabaseBinding,
} from "@hackerfeed/backend/database/client";
import { runHuggingFaceDailyPapersIngestion } from "@hackerfeed/backend/huggingface-papers/ingestion";
import {
	linkClientTrace,
	withoutIncomingTrace,
	withServerTraceId,
} from "@hackerfeed/runtime/client-trace";
import { getTraceId, logger } from "@hackerfeed/runtime/logger";
import { sentryDataCollection } from "@hackerfeed/runtime/sentry-data-collection";
import * as Sentry from "@sentry/cloudflare";
import { onlyFromOrigin } from "./cors";

type WorkerEnv = {
	DB: D1DatabaseBinding;
	ALLOWED_ORIGIN: string;
	WORKOS_CLIENT_ID: string;
	WORKOS_API_HOSTNAME?: string;
	SENTRY_DSN?: string;
	SENTRY_ENVIRONMENT?: string;
	SENTRY_TRACES_SAMPLE_RATE?: string;
};

function getSentrySampleRate(value: string | undefined, fallback: number) {
	if (!value) return fallback;

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

async function handleApiFetch(request: Request, env: WorkerEnv) {
	linkClientTrace(request);

	const backend = createBackend({
		workos: {
			apiHostname: env.WORKOS_API_HOSTNAME,
			clientId: env.WORKOS_CLIENT_ID,
		},
		database: createDatabaseContext(env.DB),
	});
	const handle = onlyFromOrigin(env.ALLOWED_ORIGIN, async (request) => {
		try {
			return await backend(request);
		} catch (error) {
			// Still inside Sentry's request span, so the issue, logs and spans share
			// the trace ID the browser reports.
			const traceId = logger.error("Unhandled API request error", {
				error,
				method: request.method,
				pathname: new URL(request.url).pathname,
			});
			return Response.json(
				{
					error: "Internal Server Error",
					message: "HackerFeed could not process this request.",
					traceId: traceId ?? null,
				},
				{ status: 500 },
			);
		}
	});

	return withServerTraceId(await handle(request), getTraceId());
}

const worker = {
	fetch: handleApiFetch,
	async scheduled(_controller, env) {
		await runHuggingFaceDailyPapersIngestion(createDatabaseContext(env.DB));
	},
} satisfies ExportedHandler<WorkerEnv>;

const instrumentedWorker = Sentry.withSentry((env: WorkerEnv) => {
	if (!env.SENTRY_DSN) return undefined;

	return {
		dsn: env.SENTRY_DSN,
		environment: env.SENTRY_ENVIRONMENT ?? "production",
		tracesSampleRate: getSentrySampleRate(env.SENTRY_TRACES_SAMPLE_RATE, 0.1),
		dataCollection: sentryDataCollection,
	};
}, worker);

const instrumentedFetch =
	instrumentedWorker.fetch as ExportedHandlerFetchHandler<WorkerEnv>;

export default {
	...instrumentedWorker,
	fetch(request, env, context) {
		return instrumentedFetch.call(
			instrumentedWorker,
			withoutIncomingTrace(request),
			env,
			context,
		);
	},
} satisfies ExportedHandler<WorkerEnv>;
