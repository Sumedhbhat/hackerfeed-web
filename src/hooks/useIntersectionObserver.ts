import { useCallback, useEffect, useRef } from "react";

export function useIntersectionObserver(
	callback: () => void,
	options?: IntersectionObserverInit,
): (node: Element | null) => void {
	const callbackRef = useRef(callback);

	useEffect(() => {
		callbackRef.current = callback;
	}, [callback]);

	const observerRef = useRef<IntersectionObserver | null>(null);

	return useCallback(
		(node: Element | null) => {
			if (observerRef.current) {
				observerRef.current.disconnect();
				observerRef.current = null;
			}
			if (!node) return;
			observerRef.current = new IntersectionObserver((entries) => {
				if (entries[0]?.isIntersecting) {
					callbackRef.current();
				}
			}, options);
			observerRef.current.observe(node);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		// options should be stable (pass a literal or useMemo'd object)
		[options],
	);
}
