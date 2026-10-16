import { useEffect, useState } from "react";
import { getTraceId, type LogContext, logger } from "#/lib/logger";

/**
 * Reports an error shown by an error UI once (from an effect, not render) and
 * returns the trace ID to show the user so the report can be found in Sentry.
 */
export function useErrorReport(
	message: string,
	error: unknown,
	context?: Omit<LogContext, "error">,
): string | undefined {
	const [traceId] = useState(getTraceId);

	// biome-ignore lint/correctness/useExhaustiveDependencies: report once per error, not per context object
	useEffect(() => {
		logger.error(message, { ...context, error });
	}, [message, error]);

	return traceId;
}
