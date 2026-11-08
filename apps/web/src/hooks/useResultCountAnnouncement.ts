import { useEffect, useRef, useState } from "react";

// Speaks only when `filterKey` (the search and filters) changes: not on first
// load, and not when the list changes for another reason (an unsave, Undo,
// Clear), which announce themselves.
export function useResultCountAnnouncement(
	count: number,
	[one, many]: [singular: string, plural: string],
	filterKey: string,
	emptyMessage = `No ${many} match.`,
) {
	const [message, setMessage] = useState("");
	const previousKeyRef = useRef(filterKey);
	// Read when the timer fires, so the count is the settled one.
	const latestRef = useRef({ count, one, many, emptyMessage });
	latestRef.current = { count, one, many, emptyMessage };
	useEffect(() => {
		if (filterKey === previousKeyRef.current) return;
		previousKeyRef.current = filterKey;
		const timer = setTimeout(() => {
			const latest = latestRef.current;
			setMessage(
				latest.count === 0
					? latest.emptyMessage
					: `${latest.count} ${latest.count === 1 ? latest.one : latest.many}`,
			);
		}, 700);
		return () => clearTimeout(timer);
	}, [filterKey]);
	return message;
}
