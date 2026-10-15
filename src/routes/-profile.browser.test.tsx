import { cleanup, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQueryClient as render } from "#/test/renderWithQueryClient";

const authMock = vi.hoisted(() => ({
	isLoading: false,
	user: null as Record<string, unknown> | null,
	search: {} as Record<string, unknown>,
}));

vi.mock("#/hooks/useAuthSession", () => ({
	useAuthSession: () => ({
		isLoading: authMock.isLoading,
		user: authMock.user,
	}),
	signIn: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: Record<string, unknown>) => ({
		...options,
		useSearch: () => authMock.search,
	}),
	Link: ({ children, to }: { children: ReactNode; to: string }) => (
		<a href={to}>{children}</a>
	),
}));

import { parseProfileSearch, Route } from "./profile";

const ProfilePage = Route.component as ComponentType;

beforeEach(() => {
	authMock.user = null;
	authMock.search = {};
	vi.stubGlobal(
		"fetch",
		vi.fn(async () =>
			Response.json({
				providers: [
					{
						id: "chatgpt",
						name: "ChatGPT",
						description: "Use your ChatGPT plan.",
						manageUrl: null,
						canConnect: true,
						connected: false,
						account: null,
					},
				],
			}),
		),
	);
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe("parseProfileSearch", () => {
	it.each([
		[{}, {}],
		[
			{ ai: "connected", provider: "chatgpt" },
			{ ai: "connected", provider: "chatgpt" },
		],
		[
			{ ai: "connected", provider: "chatgpt", reason: "x" },
			{ ai: "connected", provider: "chatgpt" },
		],
		[
			{ ai: "error", provider: "claude", reason: "access_denied" },
			{ ai: "error", provider: "claude", reason: "access_denied" },
		],
		[{ ai: "error", provider: "<x>", reason: "<script>" }, { ai: "error" }],
		[{ ai: "bogus", provider: "chatgpt", reason: "expired" }, {}],
		[{ provider: "chatgpt" }, {}],
	])("parses %j", (input, expected) => {
		expect(parseProfileSearch(input)).toEqual(expected);
	});
});

describe("ProfilePage", () => {
	it("shows the AI assistants section for signed-in users", async () => {
		authMock.user = {
			id: "u1",
			email: "reader@example.com",
			firstName: "Ada",
			lastName: null,
			profilePictureUrl: null,
		};
		render(<ProfilePage />);

		expect(
			screen.getByRole("heading", { name: "AI assistants" }),
		).toBeDefined();
		await screen.findByRole("button", { name: "Sign in with ChatGPT" });
	});

	it("passes callback results to the AI assistants section", async () => {
		authMock.user = {
			id: "u1",
			email: "reader@example.com",
			firstName: null,
			lastName: null,
			profilePictureUrl: null,
		};
		authMock.search = { ai: "error", provider: "chatgpt", reason: "expired" };
		render(<ProfilePage />);

		expect((await screen.findByRole("alert")).textContent).toContain(
			"took too long",
		);
	});

	it("doesn't show the AI assistants section to signed-out users", () => {
		render(<ProfilePage />);

		expect(screen.queryByRole("heading", { name: "AI assistants" })).toBeNull();
	});
});
