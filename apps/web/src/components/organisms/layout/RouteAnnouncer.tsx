import { LiveStatus } from "@hackerfeed/ui/atoms/LiveStatus";
import { useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

// Client-side navigation gives screen readers no cue, so announce the new
// title (not on first load, where the browser reads it itself).
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
