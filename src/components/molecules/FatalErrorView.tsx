import type { CSSProperties } from "react";

const mainStyle: CSSProperties = {
	boxSizing: "border-box",
	fontFamily:
		'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
	margin: "0 auto",
	maxWidth: "38rem",
	minHeight: "100vh",
	padding: "12vh 1.5rem",
	width: "100%",
};

const kickerStyle: CSSProperties = {
	fontSize: "0.72rem",
	fontWeight: 750,
	letterSpacing: "0.1em",
	margin: "0 0 0.85rem",
	opacity: 0.55,
	textTransform: "uppercase",
};

const headingStyle: CSSProperties = {
	fontSize: "clamp(1.6rem, 4vw, 2.35rem)",
	lineHeight: 1.08,
	margin: "0 0 1rem",
};

const paragraphStyle: CSSProperties = {
	fontSize: "1rem",
	lineHeight: 1.55,
	margin: "0 0 1rem",
	opacity: 0.75,
};

const codeStyle: CSSProperties = {
	background: "rgba(127, 127, 127, 0.12)",
	borderRadius: "5px",
	fontSize: "0.85rem",
	overflowWrap: "anywhere",
	padding: "0.16rem 0.32rem",
};

const linkStyle: CSSProperties = {
	color: "inherit",
	fontWeight: 700,
};

type FatalErrorViewProps = {
	traceId?: string;
};

export function FatalErrorView({ traceId }: FatalErrorViewProps) {
	return (
		<main style={mainStyle}>
			<p style={kickerStyle}>Application error</p>
			<h1 style={headingStyle}>HackerFeed could not load.</h1>
			<p style={paragraphStyle}>
				Something went wrong while loading HackerFeed. The error has been logged
				automatically.
			</p>
			{traceId ? (
				<p style={paragraphStyle}>
					Trace ID: <code style={codeStyle}>{traceId}</code>
				</p>
			) : null}
			<p style={paragraphStyle}>
				<a href="/" style={linkStyle}>
					Try loading the feed again
				</a>
			</p>
		</main>
	);
}
