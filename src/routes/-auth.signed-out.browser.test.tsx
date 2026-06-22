import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: Record<string, unknown>) => options,
}));

import { Route } from "./auth.signed-out";

const SignedOutPage = Route.component as ComponentType;

afterEach(cleanup);

describe("SignedOutPage", () => {
	it("confirms logout and offers a new sign-in flow", () => {
		render(<SignedOutPage />);

		expect(
			screen.getByRole("heading", { name: "You're signed out" }),
		).toBeDefined();
		expect(
			screen.getByRole("link", { name: "Sign in" }).getAttribute("href"),
		).toBe("/auth/sign-in?returnTo=/");
	});
});
