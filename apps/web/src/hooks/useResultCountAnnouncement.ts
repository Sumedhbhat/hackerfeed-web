import { useEffect, useRef, useState } from "react";

/**
 * Tells screen readers how many results match once typing or a filter change
 * settles (WCAG 4.1.3), for a `LiveStatus`. Nothing is announced until the
 * filters first change. `filterKey` changes whenever the filters do.
 */
export function useResultCountAnnouncement(
	count: number,
	[one, many]: [singular: string, plural: string],
	filterKey: string,
) {
	const [message, setMessage] = useState("");
	const firstKeyRef = useRef<string | null>(filterKey);
	useEffect(() => {
		if (filterKey === firstKeyRef.current) return;
		firstKeyRef.current = null; // the filters have changed at least once
		const timer = setTimeout(
			() =>
				setMessage(
					count === 0
						? `No ${many} match.`
						: `${count} ${count === 1 ? one : many}`,
				),
			700,
		);
		return () => clearTimeout(timer);
	}, [count, filterKey, one, many]);
	return message;
}
