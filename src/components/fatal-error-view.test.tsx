import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FatalErrorView } from "./fatal-error-view";

afterEach(cleanup);

describe("FatalErrorView", () => {
	it("renders the global recovery message without internal error details", () => {
		render(<FatalErrorView />);

		expect(
			screen.getByRole("heading", { name: "HackerFeed could not load." }),
		).toBeDefined();
		const retryLink = screen.getByRole("link", {
			name: "Try loading the feed again",
		});
		expect(retryLink.getAttribute("href")).toBe("/");
		expect(screen.queryByText(/Trace ID:/)).toBeNull();
	});

	it("shows a trace ID when one is available", () => {
		const traceId = "0123456789abcdef0123456789abcdef";
		render(<FatalErrorView traceId={traceId} />);

		expect(screen.getByText(traceId).textContent).toBe(traceId);
	});
});
