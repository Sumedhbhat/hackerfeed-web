import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => ({ signIn: vi.fn() }));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: Record<string, unknown>) => options,
}));

vi.mock("#/hooks/useAuthSession", () => authMock);

import { Route } from "./auth.signed-out";

const SignedOutPage = Route.component as ComponentType;

afterEach(cleanup);

describe("SignedOutPage", () => {
	it("confirms logout and offers a new sign-in flow", () => {
		render(<SignedOutPage />);

		expect(
			screen.getByRole("heading", { name: "You're signed out" }),
		).toBeDefined();
		fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

		expect(authMock.signIn).toHaveBeenCalledWith("/");
	});
});
