import { logger } from "@hackerfeed/runtime/logger";
import { useShowToast } from "@hackerfeed/ui/atoms/Toast";
import { ErrorDetails } from "@hackerfeed/ui/molecules/ErrorDetails";
import { useEffect, useState } from "react";
import { type ErrorNotice, onErrorNotice } from "#/lib/errors/report-error";

const ERROR_TOAST_TIMEOUT_MS = 10_000;

/** Shows every notice raised by `reportError` as a toast. Renders nothing itself. */
export function ErrorNotifications() {
	const showToast = useShowToast();

	useEffect(
		() =>
			onErrorNotice((notice) =>
				showToast({
					title: notice.message,
					details: <NoticeDetails notice={notice} />,
					timeout: ERROR_TOAST_TIMEOUT_MS,
					priority: "high",
				}),
			),
		[showToast],
	);

	return null;
}

function NoticeDetails({ notice }: { notice: ErrorNotice }) {
	const [open, setOpen] = useState(false);
	const [copied, setCopied] = useState(false);
	const errorId = notice.serverTraceId ?? notice.clientTraceId;
	if (!errorId) return null;

	function copy() {
		navigator.clipboard
			.writeText(errorId ?? "")
			.then(() => setCopied(true))
			.catch((error) => logger.warn("Copying the error ID failed", { error }));
	}

	return (
		<ErrorDetails
			errorId={errorId}
			browserTraceId={notice.clientTraceId}
			open={open}
			onOpenChange={setOpen}
			copied={copied}
			onCopy={copy}
		/>
	);
}
