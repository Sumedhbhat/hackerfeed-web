import { useEffect, useState } from "react";
import { getServerTraceId } from "#/lib/errors/report-error";
import { getTraceId, type LogContext, logger } from "#/lib/logger";

/**
 * Reports an error shown by an error UI once (from an effect, not render) and
 * returns the trace ID to show the user so the report can be found in Sentry:
 * the Worker's when the failing request reached it, else the browser's.
 */
export function useErrorReport(
	message: string,
	error: unknown,
	context?: Omit<LogContext, "error">,
): string | undefined {
	const [traceId] = useState(() => getServerTraceId(error) ?? getTraceId());

	// biome-ignore lint/correctness/useExhaustiveDependencies: report once per error, not per context object
	useEffect(() => {
		logger.error(message, {
			...context,
			error,
			serverTraceId: getServerTraceId(error),
		});
	}, [message, error]);

	return traceId;
}
