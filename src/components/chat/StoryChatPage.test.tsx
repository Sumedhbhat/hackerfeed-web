import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HackerNewsStoryRecord } from "#/lib/hacker-news/queries";
import { StoryChatPage } from "./StoryChatPage";

const authMock = vi.hoisted(() => ({
	isLoading: false,
	user: { id: "user-1" } as { id: string } | null,
	signIn: vi.fn(),
}));

vi.mock("#/hooks/useAuthSession", () => ({
	useAuthSession: () => ({
		isLoading: authMock.isLoading,
		user: authMock.user,
	}),
	signIn: authMock.signIn,
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		to,
		params,
		className,
	}: {
		children: ReactNode;
		to: string;
		params?: Record<string, unknown>;
		className?: string;
	}) => (
		<a
			href={
				params ? to.replace(/\$(\w+)/g, (_, k) => String(params[k] ?? "")) : to
			}
			className={className}
		>
			{children}
		</a>
	),
}));

const story: HackerNewsStoryRecord = {
	by: "pg",
	descendants: 3,
	id: 42,
	kids: [],
	score: 100,
	text: null,
	time: 1_700_000_000,
	title: "Interesting article",
	type: "story",
	url: "https://example.com/article",
};

type ChatHandler = (
	body: {
		messages: { role: string; content: string }[];
		model: string;
	},
	signal?: AbortSignal | null,
) => Response | Promise<Response>;

let status: Record<string, unknown>;
let models: Response | (() => Response);
let chatHandler: ChatHandler;
let chatBodies: {
	messages: { role: string; content: string }[];
	model: string;
}[];

function ndjson(...events: unknown[]) {
	return new Response(
		events.map((event) => `${JSON.stringify(event)}\n`).join(""),
		{ headers: { "content-type": "application/x-ndjson" } },
	);
}

function renderPage({ withStory = true } = {}) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	if (withStory) {
		queryClient.setQueryData(["hacker-news", "story", 42], story);
	}
	return render(
		<QueryClientProvider client={queryClient}>
			<StoryChatPage storyId={42} />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	authMock.isLoading = false;
	authMock.user = { id: "user-1" };
	authMock.signIn.mockReset();
	status = {
		canConnect: true,
		connected: true,
		email: "r@example.com",
		name: null,
	};
	models = () =>
		Response.json({
			models: [
				{ slug: "gpt-a", displayName: "GPT A" },
				{ slug: "gpt-b", displayName: "GPT B" },
			],
		});
	chatBodies = [];
	chatHandler = () =>
		ndjson(
			{ type: "delta", text: "It is " },
			{ type: "delta", text: "about X." },
			{ type: "done" },
		);
	vi.stubGlobal(
		"fetch",
		vi.fn(async (url: string, init?: RequestInit) => {
			if (url === "/api/chatgpt/status") return Response.json(status);
			if (url === "/api/chatgpt/models") {
				return typeof models === "function" ? models() : models;
			}
			if (url === "/api/chatgpt/chat") {
				const body = JSON.parse(init?.body as string);
				chatBodies.push(body);
				return chatHandler(body, init?.signal);
			}
			throw new Error(`Unexpected fetch ${url}`);
		}),
	);
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe("StoryChatPage", () => {
	it("shows the story header and a link back to the story", async () => {
		renderPage();

		expect(
			screen.getByRole("heading", { name: "Interesting article" }),
		).toBeDefined();
		expect(
			screen.getByRole("link", { name: /story/i }).getAttribute("href"),
		).toBe("/story/42");
		expect(
			screen.getByRole("link", { name: /read article/i }).getAttribute("href"),
		).toBe("https://example.com/article");
		await screen.findByLabelText("Message");
	});

	it("asks signed-out users to sign in and returns them to the chat", () => {
		authMock.user = null;
		renderPage();

		fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

		expect(authMock.signIn).toHaveBeenCalledWith("/chat/42");
	});

	it("points unconnected users to the profile, with a ChatGPT fallback", async () => {
		status = { canConnect: true, connected: false, email: null, name: null };
		renderPage();

		const connect = await screen.findByRole("link", {
			name: "Connect ChatGPT in profile",
		});
		expect(connect.getAttribute("href")).toBe("/profile");
		const fallback = screen.getByRole("link", {
			name: "Open in ChatGPT instead",
		});
		expect(new URL(fallback.getAttribute("href") ?? "").origin).toBe(
			"https://chatgpt.com",
		);
		expect(screen.queryByLabelText("Message")).toBeNull();
	});

	it("streams a reply to a typed question", async () => {
		renderPage();

		const input = await screen.findByLabelText("Message");
		fireEvent.change(input, { target: { value: "What is this about?" } });
		fireEvent.click(screen.getByRole("button", { name: "Send" }));

		await screen.findByText("It is about X.");
		const messages = screen.getByRole("list", { name: "Messages" });
		expect(within(messages).getByText("What is this about?")).toBeDefined();
		expect(chatBodies).toEqual([
			{
				storyId: 42,
				model: "gpt-a",
				messages: [{ role: "user", content: "What is this about?" }],
			},
		]);
		expect((input as HTMLTextAreaElement).value).toBe("");
	});

	it("sends the whole conversation on follow-up questions", async () => {
		renderPage();

		const input = await screen.findByLabelText("Message");
		fireEvent.change(input, { target: { value: "First?" } });
		fireEvent.keyDown(input, { key: "Enter" });
		await screen.findByText("It is about X.");

		chatHandler = () =>
			ndjson({ type: "delta", text: "Second answer" }, { type: "done" });
		fireEvent.change(input, { target: { value: "Second?" } });
		fireEvent.keyDown(input, { key: "Enter" });
		await screen.findByText("Second answer");

		expect(chatBodies[1]?.messages).toEqual([
			{ role: "user", content: "First?" },
			{ role: "assistant", content: "It is about X." },
			{ role: "user", content: "Second?" },
		]);
	});

	it("does not send on Shift+Enter or with an empty draft", async () => {
		renderPage();

		const input = await screen.findByLabelText("Message");
		expect(
			(screen.getByRole("button", { name: "Send" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
		fireEvent.change(input, { target: { value: "line one" } });
		fireEvent.keyDown(input, { key: "Enter", shiftKey: true });

		expect(chatBodies).toHaveLength(0);
	});

	it("starts a conversation from a suggested prompt", async () => {
		renderPage();

		fireEvent.click(
			await screen.findByRole("button", {
				name: "Summarize this article in a few bullet points.",
			}),
		);

		await screen.findByText("It is about X.");
		expect(chatBodies[0]?.messages[0]?.content).toBe(
			"Summarize this article in a few bullet points.",
		);
	});

	it("uses the selected model", async () => {
		renderPage();

		fireEvent.change(await screen.findByRole("combobox", { name: "Model" }), {
			target: { value: "gpt-b" },
		});
		fireEvent.change(screen.getByLabelText("Message"), {
			target: { value: "Hi" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Send" }));

		await screen.findByText("It is about X.");
		expect(chatBodies[0]?.model).toBe("gpt-b");
	});

	it("shows errors and retries the failed question", async () => {
		chatHandler = () =>
			Response.json(
				{
					code: "network_error",
					message: "Could not reach ChatGPT.",
					retryable: true,
				},
				{ status: 502 },
			);
		renderPage();

		fireEvent.change(await screen.findByLabelText("Message"), {
			target: { value: "Hello?" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Send" }));

		const alert = await screen.findByRole("alert");
		expect(alert.textContent).toContain("Could not reach ChatGPT.");

		chatHandler = () =>
			ndjson({ type: "delta", text: "Back now" }, { type: "done" });
		fireEvent.click(within(alert).getByRole("button", { name: "Try again" }));

		await screen.findByText("Back now");
		expect(chatBodies[1]?.messages).toEqual([
			{ role: "user", content: "Hello?" },
		]);
		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("keeps partial text when the stream fails midway", async () => {
		chatHandler = () =>
			ndjson(
				{ type: "delta", text: "Partial answer" },
				{
					type: "error",
					code: "subscription_sharing_usage_limit_exceeded",
					message: "You've reached a ChatGPT usage limit.",
					retryable: false,
				},
			);
		renderPage();

		fireEvent.change(await screen.findByLabelText("Message"), {
			target: { value: "Go" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Send" }));

		await screen.findByText("Partial answer");
		expect((await screen.findByRole("alert")).textContent).toContain(
			"usage limit",
		);
		expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
	});

	it("offers a reconnect link when the connection expired", async () => {
		chatHandler = () =>
			Response.json(
				{ code: "chatgpt_not_connected", message: "Connect ChatGPT first." },
				{ status: 409 },
			);
		renderPage();

		fireEvent.change(await screen.findByLabelText("Message"), {
			target: { value: "Go" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Send" }));

		const alert = await screen.findByRole("alert");
		expect(
			within(alert)
				.getByRole("link", { name: "Reconnect in profile" })
				.getAttribute("href"),
		).toBe("/profile");
	});

	it("lets the user stop a streaming reply", async () => {
		// Like real fetch, aborting errors the in-flight response body.
		chatHandler = (_body, signal) =>
			new Response(
				new ReadableStream({
					start(controller) {
						controller.enqueue(
							new TextEncoder().encode('{"type":"delta","text":"Slow"}\n'),
						);
						signal?.addEventListener("abort", () =>
							controller.error(new DOMException("Aborted", "AbortError")),
						);
					},
				}),
			);
		renderPage();

		fireEvent.change(await screen.findByLabelText("Message"), {
			target: { value: "Go" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Send" }));

		await screen.findByText("Slow");
		fireEvent.click(screen.getByRole("button", { name: "Stop" }));

		await screen.findByRole("button", { name: "Send" });
		// The partial reply is kept and no error is shown for a user cancel.
		expect(screen.getByText("Slow")).toBeDefined();
		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("clears the conversation with New chat", async () => {
		renderPage();

		fireEvent.change(await screen.findByLabelText("Message"), {
			target: { value: "Hi" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Send" }));
		await screen.findByText("It is about X.");

		fireEvent.click(screen.getByRole("button", { name: "New chat" }));

		expect(screen.queryByText("It is about X.")).toBeNull();
		expect(
			screen.getByRole("button", {
				name: "Summarize this article in a few bullet points.",
			}),
		).toBeDefined();
	});

	it("shows model loading errors with a retry", async () => {
		models = () =>
			Response.json(
				{
					code: "subscription_sharing_user_not_eligible",
					message: "Your ChatGPT plan can't be used in other apps.",
				},
				{ status: 502 },
			);
		renderPage();

		expect((await screen.findByRole("alert")).textContent).toContain(
			"can't be used in other apps",
		);
		expect(screen.getByRole("button", { name: "Retry" })).toBeDefined();
	});

	it("handles accounts with no available models", async () => {
		models = () => Response.json({ models: [] });
		renderPage();

		expect((await screen.findByRole("alert")).textContent).toContain(
			"No ChatGPT models",
		);
	});

	it("shows an error when the story can't be loaded", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
		renderPage({ withStory: false });

		await screen.findByText("Story unavailable.");
	});
});
