import { useEffect, useRef } from "react";
import { restoreReturnFocus } from "#/lib/a11y/return-focus";

/** Restores focus to the control used to leave this page, once `ready` (its list has rendered). */
export function useRestoreReturnFocus(ready: boolean) {
	const doneRef = useRef(false);
	useEffect(() => {
		if (!ready || doneRef.current) return;
		doneRef.current = true;
		// After the router has restored the scroll position.
		requestAnimationFrame(() => restoreReturnFocus());
	}, [ready]);
}
