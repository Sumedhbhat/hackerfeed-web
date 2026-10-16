/** Shows the Sentry trace ID on an error screen so users can quote it. */
export function TraceIdNote({ traceId }: { traceId?: string }) {
	if (!traceId) return null;

	return (
		<p className="m-0 mt-3 text-xs text-(--sea-ink-soft)">
			Trace ID: <code className="select-all wrap-anywhere">{traceId}</code>
		</p>
	);
}
