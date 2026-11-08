import { useEffect, useRef } from "react";
import { focusFirstIn } from "#/lib/a11y/focus";

// Keyboard users continue at the first new row, rather than staying on (or
// losing focus with) the Load more button.
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
