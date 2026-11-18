import {
	withoutIncomingTrace,
	withServerTraceId,
} from "@hackerfeed/runtime/client-trace";
import { getTraceId, logger } from "@hackerfeed/runtime/logger";
import { sentryDataCollection } from "@hackerfeed/runtime/sentry-data-collection";
import { SERVER_TRACE_ID_HEADER } from "@hackerfeed/runtime/trace-headers";
import * as Sentry from "@sentry/cloudflare";
import type { Register } from "@tanstack/react-router";
import {
	createStartHandler,
	defaultStreamHandler,
	type RequestHandler,
} from "@tanstack/react-start/server";
import { createServerEntry } from "@tanstack/react-start/server-entry";
import { env } from "#/env";
import { buildContentSecurityPolicy } from "#/server/content-security-policy";
import { renderServerErrorPage } from "#/server/errors/server-error-page";

type WorkerEnv = {
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

// Dev tools connect to their own local servers, so only built apps get it.
const contentSecurityPolicy = import.meta.env.DEV
	? undefined
	: buildContentSecurityPolicy({
			apiUrl: env.VITE_API_URL,
			workosApiHostname: env.VITE_WORKOS_API_HOSTNAME,
			sentryDsn: env.VITE_SENTRY_DSN,
		});

function withContentSecurityPolicy(response: Response): Response {
	if (!contentSecurityPolicy) return response;
	const secured = new Response(response.body, response);
	secured.headers.set("Content-Security-Policy", contentSecurityPolicy);
	return secured;
}

function wantsJson(request: Request) {
	const accept = request.headers.get("accept") ?? "";

	return accept.includes("application/json") || !accept.includes("text/html");
}

function renderErrorResponse(request: Request, traceId: string | undefined) {
	const headers = new Headers();
	if (traceId) headers.set(SERVER_TRACE_ID_HEADER, traceId);

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

async function handleAppFetch(request: Request) {
	try {
		return withContentSecurityPolicy(
			withServerTraceId(await startFetch(request), getTraceId()),
		);
	} catch (error) {
		// Still inside Sentry's request span, so the issue, logs and spans share
		// the trace ID the user sees on the error page.
		const traceId = logger.error("Unhandled server request error", {
			error,
			method: request.method,
			pathname: new URL(request.url).pathname,
		});
		return withContentSecurityPolicy(renderErrorResponse(request, traceId));
	}
}

const serverEntry = createServerEntry({
	fetch: handleAppFetch as unknown as RequestHandler<Register>,
});

const worker = serverEntry as unknown as ExportedHandler<WorkerEnv>;

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
