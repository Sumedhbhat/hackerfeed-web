import * as Sentry from "@sentry/cloudflare";
import type { Register } from "@tanstack/react-router";
import {
	createStartHandler,
	defaultStreamHandler,
	type RequestHandler,
} from "@tanstack/react-start/server";
import { createServerEntry } from "@tanstack/react-start/server-entry";
import { logger } from "#/lib/logger";
import { sentryDataCollection } from "#/lib/sentry-data-collection";
import {
	createDatabaseContext,
	type D1DatabaseBinding,
	setDatabaseContext,
} from "#/server/database/client";
import { renderServerErrorPage } from "#/server/errors/server-error-page";
import { runHuggingFaceDailyPapersIngestion } from "#/server/huggingface-papers/ingestion";

type WorkerEnv = {
	DB: D1DatabaseBinding;
	SENTRY_DSN?: string;
	SENTRY_ENVIRONMENT?: string;
	SENTRY_TRACES_SAMPLE_RATE?: string;
};

const startFetch = createStartHandler(defaultStreamHandler);

function getSentrySampleRate(value: string | undefined, fallback: number) {
	if (!value) return fallback;

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function wantsJson(request: Request) {
	const url = new URL(request.url);
	const accept = request.headers.get("accept") ?? "";

	return (
		url.pathname.startsWith("/api/") ||
		accept.includes("application/json") ||
		!accept.includes("text/html")
	);
}

function renderErrorResponse(request: Request, traceId: string | undefined) {
	const headers = new Headers();
	if (traceId) headers.set("x-sentry-trace-id", traceId);

	if (wantsJson(request)) {
		return Response.json(
			{
				error: "Internal Server Error",
				message: "HackerFeed could not process this request.",
				traceId: traceId ?? null,
			},
			{ status: 500, headers },
		);
	}

	headers.set("content-type", "text/html; charset=utf-8");
	return new Response(renderServerErrorPage(traceId), { status: 500, headers });
}

function createWorkerDatabaseContext(env: WorkerEnv) {
	return createDatabaseContext(env.DB);
}

async function handleAppFetch(request: Request, env: WorkerEnv) {
	setDatabaseContext(createWorkerDatabaseContext(env));

	try {
		return await startFetch(request);
	} catch (error) {
		// Still inside Sentry's request span, so the issue, logs and spans share
		// the trace ID the user sees on the error page.
		const traceId = logger.error("Unhandled server request error", {
			error,
			method: request.method,
			pathname: new URL(request.url).pathname,
		});
		return renderErrorResponse(request, traceId);
	}
}

const serverEntry = createServerEntry({
	fetch: handleAppFetch as unknown as RequestHandler<Register>,
});

const worker = {
	...serverEntry,
	scheduled(
		_controller: ScheduledController,
		env: WorkerEnv,
		context: ExecutionContext,
	) {
		const database = createWorkerDatabaseContext(env);
		const ingestion = runHuggingFaceDailyPapersIngestion(database);
		context.waitUntil(ingestion);
		return ingestion;
	},
} as unknown as ExportedHandler<WorkerEnv>;

const instrumentedWorker = Sentry.withSentry((env: WorkerEnv) => {
	if (!env.SENTRY_DSN) return undefined;

	return {
		dsn: env.SENTRY_DSN,
		environment: env.SENTRY_ENVIRONMENT ?? "production",
		tracesSampleRate: getSentrySampleRate(env.SENTRY_TRACES_SAMPLE_RATE, 0.1),
		dataCollection: sentryDataCollection,
	};
}, worker);

export default instrumentedWorker;
