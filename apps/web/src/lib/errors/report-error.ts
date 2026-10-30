import { TRPCClientError } from "@trpc/client";
import { AiRequestError } from "#/lib/ai/client";
import { type LogContext, logger } from "#/lib/logger";
import { readServerTraceId } from "#/lib/tracing/headers";

/** What the user was doing when it failed; picks the fallback message. */
export type FailedAction = "load" | "save" | "remove";

/** A failure ready to show: a human message plus the IDs to look it up. */
export type ErrorNotice = {
	id: string;
	message: string;
	/** The Worker's trace, when the failing request reached it. */
	serverTraceId?: string;
	/** The browser trace the error was logged in. */
	clientTraceId?: string;
};

const FALLBACK_MESSAGES: Record<FailedAction, string> = {
	load: "Sorry, we couldn't load this.",
	save: "Sorry, we couldn't save this.",
	remove: "Sorry, we couldn't remove this.",
};

function getStatus(error: unknown): number | undefined {
	if (error instanceof AiRequestError) return error.status;
	if (error instanceof TRPCClientError) {
		const status = (error.data as { httpStatus?: unknown } | undefined)
			?.httpStatus;
		return typeof status === "number" ? status : undefined;
	}
	return undefined;
}

function getResponse(error: unknown): Response | undefined {
	if (!(error instanceof TRPCClientError)) return undefined;
	const response = (error.meta as { response?: unknown } | undefined)?.response;
	return response instanceof Response ? response : undefined;
}

function isNetworkError(error: unknown): boolean {
	if (error instanceof TypeError) return true;
	return (
		error instanceof TRPCClientError &&
		!getResponse(error) &&
		error.cause instanceof TypeError
	);
}

export function getServerTraceId(error: unknown): string | undefined {
	if (error instanceof AiRequestError) return error.traceId;
	const response = getResponse(error);
	return response ? readServerTraceId(response) : undefined;
}

/** Turns any thrown value into a sentence a user can read. */
export function toUserMessage(
	error: unknown,
	action: FailedAction,
	fallback = FALLBACK_MESSAGES[action],
): string {
	if (isNetworkError(error)) {
		return "Couldn't reach HackerFeed. Check your connection and try again.";
	}
	const status = getStatus(error);
	if (status === 401) return "Your session expired. Sign in again to continue.";
	if (status === 429)
		return "Too many requests. Wait a moment, then try again.";
	if (error instanceof AiRequestError) return error.message;
	return fallback;
}

type NoticeListener = (notice: ErrorNotice) => void;

const listeners = new Set<NoticeListener>();

/** Subscribes the notification UI; returns the unsubscribe function. */
export function onErrorNotice(listener: NoticeListener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

let nextNoticeId = 0;

export type ReportErrorOptions = Omit<LogContext, "error"> & {
	action: FailedAction;
	/** Replaces the generic fallback for this action. */
	message?: string;
	/** Log only, for errors the screen already shows. Defaults to true. */
	notify?: boolean;
};

/**
 * The one place a handled failure goes: logs it to Sentry, works out what to
 * tell the user, and raises a notification with the trace IDs.
 */
export function reportError(
	logMessage: string,
	error: unknown,
	{ action, message, notify = true, ...context }: ReportErrorOptions,
): ErrorNotice {
	const serverTraceId = getServerTraceId(error);
	const clientTraceId = logger.error(logMessage, {
		...context,
		error,
		serverTraceId,
	});
	nextNoticeId += 1;
	const notice: ErrorNotice = {
		id: `error-${nextNoticeId}`,
		message: toUserMessage(error, action, message),
		serverTraceId,
		clientTraceId,
	};
	if (notify) {
		for (const listener of listeners) listener(notice);
	}
	return notice;
}
