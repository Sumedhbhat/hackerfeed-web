import { useEffect, useRef } from "react";
import { focusFirstIn } from "#/lib/a11y/focus";

/**
 * After "Load more", move focus to the first new row so a keyboard or screen
 * reader user continues where the new items start (WCAG 2.4.3), instead of
 * staying on (or losing focus with) the button.
 *
 * Returns the click handler wrapper; `count` is the number of rendered rows
 * in the list with id `listId`.
 */
export function useLoadMoreFocus(listId: string, count: number) {
	const firstNewRef = useRef<number | null>(null);
	useEffect(() => {
		const firstNew = firstNewRef.current;
		if (firstNew === null || count <= firstNew) return;
		firstNewRef.current = null;
		focusFirstIn(document.getElementById(listId)?.children[firstNew]);
	}, [count, listId]);
	return (loadMore: () => void) => () => {
		firstNewRef.current = count;
		loadMore();
	};
}
