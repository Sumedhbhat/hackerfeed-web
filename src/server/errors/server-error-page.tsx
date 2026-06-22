import "@tanstack/react-start/server-only";

import { renderToStaticMarkup } from "react-dom/server";

const styles = `
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
`;

type ServerErrorPageProps = {
	traceId?: string;
};

export function ServerErrorPage({ traceId }: ServerErrorPageProps) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>HackerFeed error</title>
				<style>{styles}</style>
			</head>
			<body>
				<main>
					<p className="kicker">Server error</p>
					<h1>HackerFeed could not load.</h1>
					<p>
						The request failed before the app could render. The error has been
						logged automatically.
					</p>
					{traceId ? (
						<p>
							Trace ID: <code>{traceId}</code>
						</p>
					) : null}
					<p>
						<a href="/">Try loading the feed again</a>
					</p>
				</main>
			</body>
		</html>
	);
}

export function renderServerErrorPage(traceId?: string): string {
	return `<!doctype html>${renderToStaticMarkup(
		<ServerErrorPage traceId={traceId} />,
	)}`;
}
