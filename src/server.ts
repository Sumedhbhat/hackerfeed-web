import type { Register } from "@tanstack/react-router";
import {
	createStartHandler,
	defaultStreamHandler,
	type RequestHandler,
} from "@tanstack/react-start/server";
import { createServerEntry } from "@tanstack/react-start/server-entry";
import { logger } from "#/lib/logger";
import { getPlatform } from "#/platform";
import { setDatabaseContext } from "#/server/database/client";
import { renderServerErrorPage } from "#/server/errors/server-error-page";

const startFetch = createStartHandler(defaultStreamHandler);

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

async function handleAppFetch(request: Request) {
	const platform = await getPlatform();
	setDatabaseContext(platform.openDatabase());

	return platform.traceRequest(request, async () => {
		try {
			return await startFetch(request);
		} catch (error) {
			// Still inside Sentry's request span, so the issue, logs and spans
			// share the trace ID the user sees on the error page.
			const traceId = logger.error("Unhandled server request error", {
				error,
				method: request.method,
				pathname: new URL(request.url).pathname,
			});
			return renderErrorResponse(request, traceId);
		}
	});
}

export default createServerEntry({
	fetch: handleAppFetch as unknown as RequestHandler<Register>,
});
