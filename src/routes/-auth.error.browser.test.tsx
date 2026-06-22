import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: Record<string, unknown>) => ({
		...options,
		useSearch: () => ({ reason: "exchange_failed" }),
	}),
	Link: ({ children, to }: { children: ReactNode; to: string }) => (
		<a data-router-link="true" href={to}>
			{children}
		</a>
	),
}));

import { Route } from "./auth.error";

const AuthErrorPage = Route.component as ComponentType;

afterEach(cleanup);

describe("AuthErrorPage", () => {
	it("uses document navigation when clearing the session", () => {
		render(<AuthErrorPage />);

		const clearSession = screen.getByRole("link", { name: "Clear session" });

		expect(clearSession.getAttribute("href")).toBe("/auth/sign-out");
		expect(clearSession.hasAttribute("data-router-link")).toBe(false);
	});
});
