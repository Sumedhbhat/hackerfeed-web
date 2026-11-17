import { cleanup, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQueryClient as render } from "#/test/renderWithQueryClient";

const authMock = vi.hoisted(() => ({
	isLoading: false,
	user: null as Record<string, unknown> | null,
}));

vi.mock("#/hooks/useAuthSession", () => ({
	useAuthSession: () => ({
		isLoading: authMock.isLoading,
		user: authMock.user,
	}),
	signIn: vi.fn(),
}));

vi.mock("@tanstack/react-router", async () => ({
	createLink: (await import("#/test/createLinkMock")).createLinkMock,
	createFileRoute: () => (options: Record<string, unknown>) => options,
	Link: ({ children, to }: { children: ReactNode; to: string }) => (
		<a href={to}>{children}</a>
	),
}));

import { Route } from "./profile";

// createFileRoute is mocked to return its options, so the component sits on Route.
const ProfilePage = (Route as unknown as { component: ComponentType })
	.component;

beforeEach(() => {
	authMock.user = null;
});

afterEach(() => {
	cleanup();
});

describe("ProfilePage", () => {
	it("shows the signed-in reader's name and a link to settings", () => {
		authMock.user = {
			id: "u1",
			email: "reader@example.com",
			firstName: "Ada",
			lastName: null,
			profilePictureUrl: null,
		};
		render(<ProfilePage />);

		expect(screen.getByText("Ada")).toBeDefined();
		expect(screen.getByRole("link", { name: "Settings" })).toBeDefined();
	});

	it("asks signed-out readers to sign in", () => {
		render(<ProfilePage />);

		expect(screen.getByRole("button", { name: "Sign in" })).toBeDefined();
	});
});
