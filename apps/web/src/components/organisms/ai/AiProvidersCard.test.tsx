import type { AiProviderStatus } from "@hackerfeed/contracts/ai";
import {
	cleanup,
	fireEvent,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { expectNoAxeViolations } from "#/test/axe";
import { renderWithQueryClient as render } from "#/test/renderWithQueryClient";
import { AiProvidersCard, getAiResultMessage } from "./AiProvidersCard";

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

function provider(overrides: Partial<AiProviderStatus> = {}): AiProviderStatus {
	return {
		id: "chatgpt",
		name: "ChatGPT",
		description: "Use your ChatGPT plan to discuss stories right here.",
		manageUrl: "https://chatgpt.com/settings/usage",
		canConnect: true,
		connected: false,
		account: null,
		...overrides,
	};
}

let providers: AiProviderStatus[] | Response;
let fetchMock: ReturnType<typeof vi.fn>;
const assign = vi.fn();

beforeEach(() => {
	authMock.user = { id: "user-1" };
	providers = [provider()];
	fetchMock = vi.fn(async (url: string) => {
		if (url === "/api/ai/providers") {
			return providers instanceof Response
				? providers
				: Response.json({ providers });
		}
		const disconnect = url.match(
			/^\/api\/ai\/providers\/([a-z-]+)\/disconnect$/,
		);
		if (disconnect && Array.isArray(providers)) {
			providers = providers.map((entry) =>
				entry.id === disconnect[1]
					? { ...entry, connected: false, account: null }
					: entry,
			);
			return Response.json({ connected: false });
		}
		const connect = url.match(/^\/ai\/([a-z-]+)\/connect/);
		if (connect) {
			return Response.json({ url: `https://${connect[1]}.test/authorize` });
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

describe("AiProvidersCard", () => {
	it("lists every provider from the catalog", async () => {
		providers = [
			provider(),
			provider({
				id: "claude",
				name: "Claude",
				description: "Use your Claude plan.",
			}),
		];
		render(<AiProvidersCard />);

		const list = await screen.findByRole("list", { name: "AI apps" });
		expect(within(list).getAllByRole("listitem")).toHaveLength(2);
		expect(
			screen.getByRole("button", { name: "Sign in with ChatGPT" }),
		).toBeDefined();
		expect(
			screen.getByRole("button", { name: "Sign in with Claude" }),
		).toBeDefined();
		expect(screen.getByText("Use your Claude plan.")).toBeDefined();
	});

	it("starts the sign-in flow for the chosen provider", async () => {
		providers = [provider(), provider({ id: "claude", name: "Claude" })];
		render(<AiProvidersCard />);

		fireEvent.click(
			await screen.findByRole("button", { name: "Sign in with Claude" }),
		);

		await waitFor(() =>
			expect(assign).toHaveBeenCalledWith("https://claude.test/authorize"),
		);
		expect(fetchMock).toHaveBeenCalledWith(
			"/ai/claude/connect?returnTo=%2Fprofile",
			expect.objectContaining({ method: "POST" }),
		);
	});

	it("explains providers that can't connect on this deployment", async () => {
		providers = [provider({ canConnect: false })];
		render(<AiProvidersCard />);

		await screen.findByText("Not available on this deployment yet.");
		expect(
			screen.queryByRole("button", { name: "Sign in with ChatGPT" }),
		).toBeNull();
	});

	it("shows the connected account with usage and disconnect controls", async () => {
		providers = [
			provider({
				connected: true,
				account: { email: "reader@example.com", name: "Reader" },
			}),
		];
		render(<AiProvidersCard />);

		await screen.findByText("Connected as reader@example.com");
		expect(
			screen.getByRole("link", { name: "Manage usage" }).getAttribute("href"),
		).toBe("https://chatgpt.com/settings/usage");
	});

	it("omits the usage link when the provider has none", async () => {
		providers = [
			provider({
				connected: true,
				manageUrl: null,
				account: { email: null, name: "Reader" },
			}),
		];
		render(<AiProvidersCard />);

		await screen.findByText("Connected as Reader");
		expect(screen.queryByRole("link", { name: "Manage usage" })).toBeNull();
	});

	it("disconnects only the chosen provider", async () => {
		providers = [
			provider({ connected: true, account: { email: "a@b.c", name: null } }),
			provider({
				id: "claude",
				name: "Claude",
				connected: true,
				account: { email: "c@d.e", name: null },
			}),
		];
		render(<AiProvidersCard />);

		fireEvent.click(
			await screen.findByRole("button", { name: "Disconnect Claude" }),
		);

		await screen.findByRole("button", { name: "Sign in with Claude" });
		expect(screen.getByText("Connected as a@b.c")).toBeDefined();
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/ai/providers/claude/disconnect",
			expect.objectContaining({ method: "POST" }),
		);
	});

	it("keeps focus and announces the result when disconnecting by keyboard", async () => {
		providers = [
			provider({ connected: true, account: { email: "a@b.c", name: null } }),
		];
		render(<AiProvidersCard />);

		const disconnect = await screen.findByRole("button", {
			name: "Disconnect ChatGPT",
		});
		disconnect.focus();
		fireEvent.click(disconnect);

		// Focus moves to the button that replaces Disconnect (WCAG 2.4.3), and
		// the change is announced (4.1.3).
		const signIn = await screen.findByRole("button", {
			name: "Sign in with ChatGPT",
		});
		await waitFor(() => expect(document.activeElement).toBe(signIn));
		expect(
			screen.getByText("ChatGPT disconnected.", { selector: "output" }),
		).toBeDefined();
	});

	it("has no axe violations with connected and disconnected rows", async () => {
		providers = [
			provider({ connected: true, account: { email: "a@b.c", name: null } }),
			provider({ id: "claude", name: "Claude" }),
		];
		const { container } = render(<AiProvidersCard />);
		await screen.findByRole("button", { name: "Disconnect ChatGPT" });
		await expectNoAxeViolations(container);
	});

	it("shows a disconnect failure", async () => {
		providers = [
			provider({ connected: true, account: { email: "a@b.c", name: null } }),
		];
		fetchMock.mockImplementation(async (url: string) =>
			url === "/api/ai/providers"
				? Response.json({ providers })
				: Response.json({ code: "x", message: "nope" }, { status: 500 }),
		);
		render(<AiProvidersCard />);

		fireEvent.click(
			await screen.findByRole("button", { name: "Disconnect ChatGPT" }),
		);

		expect((await screen.findByRole("alert")).textContent).toContain(
			"Couldn't disconnect ChatGPT",
		);
	});

	it("confirms a successful connection from the callback", async () => {
		providers = [
			provider({ connected: true, account: { email: "a@b.c", name: null } }),
		];
		render(<AiProvidersCard result="connected" resultProviderId="chatgpt" />);

		// Each provider row also has its own (empty) status for disconnects.
		const statuses = await screen.findAllByRole("status");
		await waitFor(() =>
			expect(statuses.map((status) => status.textContent).join(" ")).toContain(
				"ChatGPT is connected.",
			),
		);
	});

	it("explains callback errors using the provider's name", async () => {
		render(
			<AiProvidersCard
				result="error"
				resultProviderId="chatgpt"
				reason="access_denied"
			/>,
		);

		await waitFor(() =>
			expect(screen.getByRole("alert").textContent).toContain(
				"ChatGPT sign-in was cancelled.",
			),
		);
	});

	it("shows an empty state when no providers are available", async () => {
		providers = [];
		render(<AiProvidersCard />);

		await screen.findByText("No AI apps are available yet.");
	});

	it("lets the user retry when the catalog can't load", async () => {
		providers = new Response("oops", { status: 500 });
		render(<AiProvidersCard />);

		await screen.findByText("Couldn't load your AI connections.");
		providers = [provider()];
		fireEvent.click(screen.getByRole("button", { name: "Retry" }));

		await screen.findByRole("button", { name: "Sign in with ChatGPT" });
	});

	it("doesn't fetch while signed out", async () => {
		authMock.user = null;
		render(<AiProvidersCard />);

		await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
	});
});

describe("getAiResultMessage", () => {
	it("maps known reasons and falls back for unknown ones", () => {
		expect(getAiResultMessage("Claude", "expired")).toBe(
			"That Claude sign-in took too long. Try again.",
		);
		expect(getAiResultMessage("ChatGPT", "plan_usage_not_granted")).toMatch(
			/ChatGPT didn't grant access/,
		);
		expect(getAiResultMessage("Claude", "something_else")).toBe(
			"Couldn't connect Claude. Try again.",
		);
		expect(getAiResultMessage("Claude", undefined)).toBe(
			"Couldn't connect Claude. Try again.",
		);
	});
});
