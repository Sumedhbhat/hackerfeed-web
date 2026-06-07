import * as Sentry from "@sentry/cloudflare";
import {
	createStartHandler,
	defaultStreamHandler,
} from "@tanstack/react-start/server";

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

function logServerError(request: Request, error: unknown, errorId: string) {
	const url = new URL(request.url);
	const entry = {
		level: "error",
		message: "Unhandled server request error",
		ts: new Date().toISOString(),
		errorId,
		method: request.method,
		pathname: url.pathname,
		err: getErrorMessage(error),
		stack: error instanceof Error ? error.stack : undefined,
	};

	console.error(JSON.stringify(entry));
}

function renderServerErrorPage(errorId: string) {
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
			<p>The request failed before the app could render. The error has been logged with reference <code>${errorId}</code>.</p>
			<p><a href="/">Try loading the feed again</a></p>
		</main>
	</body>
</html>`;
}

async function handleFetch(request: Request) {
	try {
		return await startFetch(request);
	} catch (error) {
		const errorId = crypto.randomUUID();

		Sentry.withScope((scope) => {
			const url = new URL(request.url);
			scope.setTag("error_id", errorId);
			scope.setTag("request_path", url.pathname);
			scope.setContext("request", {
				method: request.method,
				url: request.url,
			});
			Sentry.captureException(error);
		});
		logServerError(request, error, errorId);

		if (wantsJson(request)) {
			return Response.json(
				{
					error: "Internal Server Error",
					message: "HackerFeed could not process this request.",
					errorId,
				},
				{ status: 500 },
			);
		}

		return new Response(renderServerErrorPage(errorId), {
			status: 500,
			headers: {
				"content-type": "text/html; charset=utf-8",
			},
		});
	}
}

export default Sentry.withSentry(
	(env: WorkerEnv) => {
		if (!env.SENTRY_DSN) return undefined;

		return {
			dsn: env.SENTRY_DSN,
			environment: env.SENTRY_ENVIRONMENT ?? "production",
			tracesSampleRate: getSentrySampleRate(env.SENTRY_TRACES_SAMPLE_RATE, 0.1),
			sendDefaultPii: false,
		};
	},
	{
		fetch: handleFetch,
	},
);
