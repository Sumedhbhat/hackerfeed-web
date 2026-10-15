import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQueryClient as render } from "#/test/renderWithQueryClient";
import {
	ChatGptConnectionCard,
	getChatGptResultMessage,
} from "./ChatGptConnectionCard";

const authMock = vi.hoisted(() => ({
	isLoading: false,
	user: { id: "user-1" } as { id: string } | null,
}));

vi.mock("#/hooks/useAuthSession", () => ({
	useAuthSession: () => ({
		isLoading: authMock.isLoading,
		user: authMock.user,
	}),
}));

let status: Record<string, unknown> | Response;
let fetchMock: ReturnType<typeof vi.fn>;
const assign = vi.fn();

beforeEach(() => {
	authMock.user = { id: "user-1" };
	status = { canConnect: true, connected: false, email: null, name: null };
	fetchMock = vi.fn(async (url: string) => {
		if (url === "/api/chatgpt/status") {
			return status instanceof Response ? status : Response.json(status);
		}
		if (url === "/api/chatgpt/disconnect") {
			status = { canConnect: true, connected: false, email: null, name: null };
			return Response.json({ connected: false });
		}
		throw new Error(`Unexpected fetch ${url}`);
	});
	vi.stubGlobal("fetch", fetchMock);
	assign.mockReset();
	Object.defineProperty(window, "location", {
		configurable: true,
		value: { ...window.location, assign, pathname: "/profile" },
	});
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe("ChatGptConnectionCard", () => {
	it("offers Sign in with ChatGPT and starts the connect flow", async () => {
		render(<ChatGptConnectionCard />);

		fireEvent.click(
			await screen.findByRole("button", { name: "Sign in with ChatGPT" }),
		);

		expect(assign).toHaveBeenCalledWith("/chatgpt/connect?returnTo=%2Fprofile");
	});

	it("explains when the deployment can't connect", async () => {
		status = { canConnect: false, connected: false, email: null, name: null };
		render(<ChatGptConnectionCard />);

		await screen.findByText(
			"ChatGPT sign-in isn't available on this deployment yet.",
		);
		expect(
			screen.queryByRole("button", { name: "Sign in with ChatGPT" }),
		).toBeNull();
	});

	it("shows the connected account with usage and disconnect controls", async () => {
		status = {
			canConnect: true,
			connected: true,
			email: "reader@example.com",
			name: "Reader",
		};
		render(<ChatGptConnectionCard />);

		await screen.findByText("Connected as reader@example.com");
		expect(
			screen.getByRole("link", { name: "Manage usage" }).getAttribute("href"),
		).toBe("https://chatgpt.com/settings/usage");
	});

	it("disconnects and returns to the connect button", async () => {
		status = { canConnect: true, connected: true, email: null, name: "Reader" };
		render(<ChatGptConnectionCard />);

		await screen.findByText("Connected as Reader");
		fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));

		await screen.findByRole("button", { name: "Sign in with ChatGPT" });
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/chatgpt/disconnect",
			expect.objectContaining({ method: "POST" }),
		);
	});

	it("shows a disconnect failure", async () => {
		status = { canConnect: true, connected: true, email: "a@b.c", name: null };
		fetchMock.mockImplementation(async (url: string) =>
			url === "/api/chatgpt/status"
				? Response.json(status)
				: Response.json({ code: "x", message: "nope" }, { status: 500 }),
		);
		render(<ChatGptConnectionCard />);

		fireEvent.click(await screen.findByRole("button", { name: "Disconnect" }));

		expect((await screen.findByRole("alert")).textContent).toContain(
			"Couldn't disconnect ChatGPT",
		);
	});

	it("confirms a successful connection from the callback", async () => {
		status = { canConnect: true, connected: true, email: "a@b.c", name: null };
		render(<ChatGptConnectionCard result="connected" />);

		expect((await screen.findByRole("status")).textContent).toContain(
			"ChatGPT is connected.",
		);
	});

	it("explains callback errors", async () => {
		render(<ChatGptConnectionCard result="error" reason="access_denied" />);

		expect((await screen.findByRole("alert")).textContent).toContain(
			"ChatGPT sign-in was cancelled.",
		);
	});

	it("lets the user retry when status can't load", async () => {
		status = new Response("oops", { status: 500 });
		render(<ChatGptConnectionCard />);

		await screen.findByText("Couldn't load your ChatGPT connection.");
		status = { canConnect: true, connected: false, email: null, name: null };
		fireEvent.click(screen.getByRole("button", { name: "Retry" }));

		await screen.findByRole("button", { name: "Sign in with ChatGPT" });
	});

	it("doesn't fetch status while signed out", async () => {
		authMock.user = null;
		render(<ChatGptConnectionCard />);

		await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
	});
});

describe("getChatGptResultMessage", () => {
	it("maps known reasons and falls back for unknown ones", () => {
		expect(getChatGptResultMessage("expired")).toMatch(/took too long/);
		expect(getChatGptResultMessage("plan_usage_not_granted")).toMatch(/plan/);
		expect(getChatGptResultMessage("something_else")).toBe(
			"Couldn't connect ChatGPT. Try again.",
		);
		expect(getChatGptResultMessage(undefined)).toBe(
			"Couldn't connect ChatGPT. Try again.",
		);
	});
});
