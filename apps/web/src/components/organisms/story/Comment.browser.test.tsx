import type { HackerNewsCommentRecord } from "@hackerfeed/hacker-news/records";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Comment } from "#/components/organisms/story/Comment";
import { ThreadExpansionProvider } from "#/hooks/useThreadExpansion";

const comment = (id: number, kids: number[] = []): HackerNewsCommentRecord => ({
	id,
	by: `user${id}`,
	text: `Comment ${id}`,
	time: 1_700_000_000,
	kids,
	parent: 1,
	type: "comment",
	deleted: false,
	dead: false,
});

// Replies arrive after a delay, so opening them really suspends.
vi.mock("#/lib/hacker-news/queries", () => ({
	commentQueryOptions: (id: number) => ({
		queryKey: ["comment", id],
		queryFn: () =>
			new Promise((resolve) => setTimeout(() => resolve(comment(id)), 50)),
	}),
}));

afterEach(cleanup);

describe("Comment replies", () => {
	it("keeps focus on the replies button while replies load (WCAG 2.4.3)", async () => {
		render(
			<QueryClientProvider client={new QueryClient()}>
				<Suspense fallback={<p>Loading page</p>}>
					<ul>
						<Comment comment={comment(1, [2])} />
					</ul>
				</Suspense>
			</QueryClientProvider>,
		);

		const trigger = screen.getByRole("button", { name: /1 reply/ });
		trigger.focus();
		await act(async () => trigger.click());

		expect(screen.queryByText("Loading page")).toBeNull();
		expect(document.activeElement).toBe(trigger);
		expect(await screen.findByText("Comment 2")).toBeTruthy();
		expect(document.activeElement).toBe(trigger);
	});

	it("opens and closes every comment's replies with Expand all / Collapse all", async () => {
		const client = new QueryClient();
		const tree = (mode: "expand" | "collapse" | null, revision: number) => (
			<QueryClientProvider client={client}>
				<ThreadExpansionProvider value={{ mode, revision }}>
					<ul>
						<Comment comment={comment(1, [2])} />
					</ul>
				</ThreadExpansionProvider>
			</QueryClientProvider>
		);
		const { rerender } = render(tree(null, 0));
		expect(screen.queryByText("Comment 2")).toBeNull();

		rerender(tree("expand", 1));
		expect(await screen.findByText("Comment 2")).toBeTruthy();
		expect(screen.getByRole("button", { name: /Hide replies/ })).toBeTruthy();

		rerender(tree("collapse", 2));
		expect(await screen.findByRole("button", { name: /1 reply/ })).toBeTruthy();
	});
});
