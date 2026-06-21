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
import { runHuggingFaceDailyPapersIngestion } from "#/server/huggingface-papers/ingestion";

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

function renderServerErrorPage(traceId: string | undefined) {
	const traceReference = traceId
		? `<p>Trace ID: <code>${traceId}</code></p>`
		: "";

	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>HackerFeed error</title>
		<style>
			:root { color-scheme: light dark; }
			body {
				margin: 0;
				background: #f3faf5;
				color: #12312f;
				font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
			}
			main {
				margin: 0 auto;
				max-width: 38rem;
				padding: 12vh 1.5rem;
			}
			p.kicker {
				font-size: 0.72rem;
				font-weight: 750;
				letter-spacing: 0.1em;
				margin: 0 0 0.85rem;
				opacity: 0.55;
				text-transform: uppercase;
			}
			h1 {
				font-size: clamp(1.6rem, 4vw, 2.35rem);
				line-height: 1.08;
				margin: 0 0 1rem;
			}
			p {
				font-size: 1rem;
				line-height: 1.55;
				margin: 0 0 1rem;
				opacity: 0.75;
			}
			code {
				background: rgba(18, 49, 47, 0.08);
				border-radius: 5px;
				font-size: 0.85rem;
				padding: 0.16rem 0.32rem;
			}
			a {
				color: inherit;
				font-weight: 700;
			}
			@media (prefers-color-scheme: dark) {
				body { background: #0d1817; color: #dceee8; }
				code { background: rgba(220, 238, 232, 0.12); }
			}
		</style>
	</head>
	<body>
		<main>
			<p class="kicker">Server error</p>
			<h1>HackerFeed could not load.</h1>
			<p>The request failed before the app could render. The error has been logged automatically.</p>
			${traceReference}
			<p><a href="/">Try loading the feed again</a></p>
		</main>
	</body>
</html>`;
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
