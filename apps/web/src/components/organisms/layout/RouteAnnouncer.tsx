import { LiveStatus } from "@hackerfeed/ui/atoms/LiveStatus";
import { useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

/**
 * Client-side navigation doesn't reload the page, so screen readers get no
 * cue that it changed. Announce the new page's title after each navigation
 * (not on first load, where the browser reads the title itself).
 */
export function RouteAnnouncer() {
	const { pathname } = useLocation();
	const [message, setMessage] = useState("");
	const firstPathRef = useRef<string | null>(pathname);
	useEffect(() => {
		if (pathname === firstPathRef.current) return;
		firstPathRef.current = null;
		// Wait a moment for the route's head() to set the new title.
		const timer = setTimeout(() => setMessage(document.title), 400);
		return () => clearTimeout(timer);
	}, [pathname]);
	return <LiveStatus message={message} />;
}
