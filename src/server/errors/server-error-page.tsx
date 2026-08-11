import "@tanstack/react-start/server-only";

import { renderToStaticMarkup } from "react-dom/server";
import { FatalErrorView } from "#/components/fatal-error-view";

const documentStyles = `
		:root { color-scheme: light dark; }
		body {
			margin: 0;
			background: #f9f7f4;
			color: #1c1a18;
		}
		@media (prefers-color-scheme: dark) {
			body { background: #0e0c0a; color: #e6e2da; }
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
				<style>{documentStyles}</style>
			</head>
			<body>
				<FatalErrorView traceId={traceId} />
			</body>
		</html>
	);
}

export function renderServerErrorPage(traceId?: string): string {
	return `<!doctype html>${renderToStaticMarkup(
		<ServerErrorPage traceId={traceId} />,
	)}`;
}
