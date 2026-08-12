import * as Sentry from "@sentry/cloudflare";
import type { Register } from "@tanstack/react-router";
import {
	createStartHandler,
	defaultStreamHandler,
	type RequestHandler,
} from "@tanstack/react-start/server";
import { createServerEntry } from "@tanstack/react-start/server-entry";
import {
	createDatabaseContext,
	type D1DatabaseBinding,
	setDatabaseContext,
} from "#/server/database/client";
import { renderServerErrorPage } from "#/server/errors/server-error-page";
import { dispatchScheduledIngestion } from "#/server/scheduled-ingestion";

type WorkerEnv = {
	DB: D1DatabaseBinding;
	SENTRY_DSN?: string;
	SENTRY_ENVIRONMENT?: string;
	SENTRY_TRACES_SAMPLE_RATE?: string;
};

const startFetch = createStartHandler(defaultStreamHandler);
const traceIdsByError = new WeakMap<object, string>();

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

function getErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : String(error);
}

function getErrorKey(error: unknown): object | undefined {
	return (typeof error === "object" && error !== null) ||
		typeof error === "function"
		? error
		: undefined;
}

function getActiveSentryTraceId(): string | undefined {
	const span = Sentry.getActiveSpan();
	if (!span) return undefined;

	const traceId = Sentry.spanToJSON(span).trace_id;
	return /^[a-f0-9]{32}$/.test(traceId) ? traceId : undefined;
}

function logServerError(
	request: Request,
	error: unknown,
	traceId: string | undefined,
) {
	const url = new URL(request.url);
	const entry = {
		level: "error",
		message: "Unhandled server request error",
		ts: new Date().toISOString(),
		method: request.method,
		pathname: url.pathname,
		traceId,
		err: getErrorMessage(error),
		stack: error instanceof Error ? error.stack : undefined,
	};

	console.error(JSON.stringify(entry));
}

function createWorkerDatabaseContext(env: WorkerEnv) {
	return createDatabaseContext(Sentry.instrumentD1WithSentry(env.DB));
}

async function handleAppFetch(request: Request, env: WorkerEnv) {
	setDatabaseContext(createWorkerDatabaseContext(env));

	try {
		return await startFetch(request);
	} catch (error) {
		const errorKey = getErrorKey(error);
		const traceId = getActiveSentryTraceId();
		if (errorKey && traceId) {
			traceIdsByError.set(errorKey, traceId);
		}
		throw error;
	}
}

const serverEntry = createServerEntry({
	fetch: handleAppFetch as unknown as RequestHandler<Register>,
});

const worker = {
	...serverEntry,
	scheduled(
		controller: ScheduledController,
		env: WorkerEnv,
		context: ExecutionContext,
	) {
		const database = createWorkerDatabaseContext(env);
		const ingestion = dispatchScheduledIngestion(
			controller.cron,
			controller.scheduledTime,
			database,
		);
		if (!ingestion) return;
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
		enableLogs: true,
		integrations: [
			Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
		],
		sendDefaultPii: false,
	};
}, worker);

const instrumentedFetch =
	instrumentedWorker.fetch as ExportedHandlerFetchHandler<WorkerEnv>;

export default {
	...instrumentedWorker,
	async fetch(request, env, context) {
		try {
			return await instrumentedFetch(request, env, context);
		} catch (error) {
			const errorKey = getErrorKey(error);
			const traceId = errorKey ? traceIdsByError.get(errorKey) : undefined;
			if (errorKey) {
				traceIdsByError.delete(errorKey);
			}
			logServerError(request, error, traceId);
			const traceHeaders = new Headers();
			if (traceId) {
				traceHeaders.set("x-sentry-trace-id", traceId);
			}

			if (wantsJson(request)) {
				return Response.json(
					{
						error: "Internal Server Error",
						message: "HackerFeed could not process this request.",
						traceId: traceId ?? null,
					},
					{ status: 500, headers: traceHeaders },
				);
			}

			traceHeaders.set("content-type", "text/html; charset=utf-8");
			return new Response(renderServerErrorPage(traceId), {
				status: 500,
				headers: traceHeaders,
			});
		}
	},
} satisfies ExportedHandler<WorkerEnv>;
