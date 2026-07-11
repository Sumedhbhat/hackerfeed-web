import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePaperFavorites } from "#/hooks/usePaperFavorites";
import type { SavedPaper } from "#/lib/paper-favorites/schemas";
import type { PaperFeedPaper } from "#/lib/papers/schemas";
import { renderWithQueryClient as render } from "#/test/renderWithQueryClient";

const authMock = vi.hoisted(() => ({ user: null as { id: string } | null }));
const trpcMock = vi.hoisted(() => ({
	add: vi.fn(),
	list: vi.fn(),
	remove: vi.fn(),
}));

vi.mock("#/hooks/useAuthSession", () => ({
	useAuthSession: () => ({ isLoading: false, user: authMock.user }),
}));

vi.mock("#/lib/trpc/client", () => ({
	createTrpcClient: () => ({
		paperFavorites: {
			add: { mutate: trpcMock.add },
			list: { query: trpcMock.list },
			remove: { mutate: trpcMock.remove },
		},
	}),
}));

const paper: PaperFeedPaper = {
	abstract: null,
	arxivId: "2607.00001",
	authors: ["Ada Lovelace"],
	entryPublishedAt: "2026-07-10T12:00:00.000Z",
	githubRepo: null,
	keywords: ["reasoning"],
	paperPublishedAt: "2026-07-10T10:00:00.000Z",
	paperUrl: "https://huggingface.co/papers/2607.00001",
	projectPage: null,
	rank: 1,
	summary: "Summary",
	title: "Test Paper",
	upvotes: 42,
};

const secondPaper: PaperFeedPaper = {
	...paper,
	arxivId: "2607.00002",
	rank: 2,
	title: "Second Paper",
};

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, reject, resolve };
}

function saved(overrides: Partial<SavedPaper> = {}): SavedPaper {
	return { ...paper, savedAt: "2026-07-11T00:00:00.000Z", ...overrides };
}

function Probe({ second = false }: { second?: boolean }) {
	const favorites = usePaperFavorites();
	return (
		<div
			data-testid={second ? "second" : "first"}
			data-can-favorite={favorites.canFavorite}
		>
			<span>{favorites.count}</span>
			<output data-testid="items">
				{JSON.stringify(favorites.savedPapers)}
			</output>
			{favorites.error ? <p>{favorites.error}</p> : null}
			<button type="button" onClick={favorites.refresh}>
				refresh
			</button>
			<button
				type="button"
				disabled={favorites.isPending(paper.arxivId)}
				onClick={() => favorites.toggleFavorite(paper)}
			>
				{favorites.isFavorited(paper.arxivId) ? "remove" : "add"}
			</button>
			<button
				type="button"
				disabled={favorites.isPending(secondPaper.arxivId)}
				onClick={() => favorites.toggleFavorite(secondPaper)}
			>
				{favorites.isFavorited(secondPaper.arxivId)
					? "remove second"
					: "add second"}
			</button>
		</div>
	);
}

beforeEach(() => {
	authMock.user = { id: `paper-user-${crypto.randomUUID()}` };
	trpcMock.add.mockResolvedValue(undefined);
	trpcMock.list.mockResolvedValue({ items: [], nextCursor: null });
	trpcMock.remove.mockResolvedValue(undefined);
});

afterEach(() => {
	cleanup();
	authMock.user = null;
	vi.clearAllMocks();
});

describe("usePaperFavorites", () => {
	it("loads every page at the maximum page size in server order", async () => {
		trpcMock.list
			.mockResolvedValueOnce({ items: [saved()], nextCursor: "page-2" })
			.mockResolvedValueOnce({
				items: [saved({ arxivId: "2607.00002", title: "Second Paper" })],
				nextCursor: null,
			});

		render(<Probe />);

		await waitFor(() =>
			expect(screen.getByTestId("first").textContent).toContain("2"),
		);
		expect(trpcMock.list).toHaveBeenCalledTimes(2);
		expect(trpcMock.list).toHaveBeenNthCalledWith(
			1,
			{
				cursor: undefined,
				limit: 50,
			},
			{ signal: expect.any(AbortSignal) },
		);
		expect(trpcMock.list).toHaveBeenNthCalledWith(
			2,
			{
				cursor: "page-2",
				limit: 50,
			},
			{ signal: expect.any(AbortSignal) },
		);
		expect(screen.getByTestId("items").textContent).toContain("Second Paper");
		const items = JSON.parse(screen.getByTestId("items").textContent ?? "[]");
		expect(items.map((item: SavedPaper) => item.arxivId)).toEqual([
			paper.arxivId,
			secondPaper.arxivId,
		]);
	});

	it("stops when pagination repeats a cursor", async () => {
		trpcMock.list
			.mockResolvedValueOnce({ items: [], nextCursor: "repeat" })
			.mockResolvedValueOnce({ items: [], nextCursor: "repeat" });

		render(<Probe />);
		await waitFor(() => expect(trpcMock.list).toHaveBeenCalledTimes(2));
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(trpcMock.list).toHaveBeenCalledTimes(2);
		expect(screen.getByTestId("first").textContent).toContain("0");
		expect(
			screen.getByText("Could not load favorites. Try again."),
		).toBeTruthy();
	});

	it("does not automatically call the backend again after a next-page failure", async () => {
		trpcMock.list
			.mockResolvedValueOnce({ items: [saved()], nextCursor: "page-2" })
			.mockRejectedValueOnce(new Error("offline"));

		render(<Probe />);
		await screen.findByText("Could not load favorites. Try again.");
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(trpcMock.list).toHaveBeenCalledTimes(2);
	});

	it("refetches a completed multi-page traversal without treating cursors as repeated", async () => {
		trpcMock.list
			.mockResolvedValueOnce({ items: [saved()], nextCursor: "page-2" })
			.mockResolvedValueOnce({
				items: [saved({ arxivId: secondPaper.arxivId })],
				nextCursor: null,
			})
			.mockResolvedValueOnce({ items: [saved()], nextCursor: "page-2" })
			.mockResolvedValueOnce({
				items: [saved({ arxivId: secondPaper.arxivId })],
				nextCursor: null,
			});

		const { queryClient } = render(<Probe />);
		await waitFor(() => expect(trpcMock.list).toHaveBeenCalledTimes(2));
		await queryClient.refetchQueries({ queryKey: ["paperFavorites"] });

		await waitFor(() => expect(trpcMock.list).toHaveBeenCalledTimes(4));
		expect(
			screen.queryByText("Could not load favorites. Try again."),
		).toBeNull();
	});

	it("retries a repeated-cursor traversal after the server cursor is corrected", async () => {
		trpcMock.list
			.mockResolvedValueOnce({ items: [], nextCursor: "repeat" })
			.mockResolvedValueOnce({ items: [], nextCursor: "repeat" })
			.mockResolvedValueOnce({ items: [saved()], nextCursor: "page-2" })
			.mockResolvedValueOnce({
				items: [saved({ arxivId: secondPaper.arxivId })],
				nextCursor: null,
			});

		render(<Probe />);
		await screen.findByText("Could not load favorites. Try again.");
		fireEvent.click(screen.getByRole("button", { name: "refresh" }));

		await waitFor(() => expect(trpcMock.list).toHaveBeenCalledTimes(4));
		await waitFor(() =>
			expect(screen.getByTestId("first").textContent).toContain("2"),
		);
		expect(
			screen.queryByText("Could not load favorites. Try again."),
		).toBeNull();
	});

	it("recovers from a list failure when retried", async () => {
		trpcMock.list
			.mockRejectedValueOnce(new Error("offline"))
			.mockResolvedValueOnce({ items: [saved()], nextCursor: null });
		render(<Probe />);

		await screen.findByText("Could not load favorites. Try again.");
		fireEvent.click(screen.getByRole("button", { name: "refresh" }));

		await waitFor(() =>
			expect(screen.getByTestId("items").textContent).toContain("Test Paper"),
		);
	});

	it("reconciles an add that resolves before an older load", async () => {
		const load = deferred<{ items: SavedPaper[]; nextCursor: null }>();
		trpcMock.list.mockReturnValue(load.promise);
		render(<Probe />);
		await waitFor(() => expect(trpcMock.list).toHaveBeenCalledTimes(1));

		fireEvent.click(screen.getByRole("button", { name: "add" }));
		await waitFor(() => expect(trpcMock.add).toHaveBeenCalledTimes(1));
		load.resolve({ items: [], nextCursor: null });

		await waitFor(() =>
			expect(screen.getByTestId("items").textContent).toContain("Test Paper"),
		);
	});

	it("reconciles a remove that resolves before an older load", async () => {
		const load = deferred<{ items: SavedPaper[]; nextCursor: null }>();
		trpcMock.list.mockReturnValue(load.promise);
		render(<Probe />);
		await waitFor(() => expect(trpcMock.list).toHaveBeenCalledTimes(1));

		// The optimistic add establishes a saved item while the initial load remains stale.
		fireEvent.click(screen.getByRole("button", { name: "add" }));
		await screen.findByRole("button", { name: "remove" });
		fireEvent.click(screen.getByRole("button", { name: "remove" }));
		await waitFor(() => expect(trpcMock.remove).toHaveBeenCalledTimes(1));
		load.resolve({ items: [saved()], nextCursor: null });

		await waitFor(() =>
			expect(screen.getByRole("button", { name: "add" })).toBeTruthy(),
		);
		expect(screen.getByTestId("items").textContent).not.toContain("Test Paper");
	});

	it("resets and reloads when the authenticated user changes or signs out", async () => {
		trpcMock.list.mockResolvedValue({ items: [saved()], nextCursor: null });
		const view = render(<Probe />);
		await waitFor(() =>
			expect(screen.getByTestId("items").textContent).toContain("Test Paper"),
		);

		authMock.user = { id: `other-${crypto.randomUUID()}` };
		trpcMock.list.mockResolvedValue({ items: [], nextCursor: null });
		view.rerender(<Probe />);
		await waitFor(() =>
			expect(screen.getByTestId("first").textContent).not.toContain(
				"Test Paper",
			),
		);
		expect(trpcMock.list).toHaveBeenCalledTimes(2);

		authMock.user = null;
		view.rerender(<Probe />);
		expect(screen.getByTestId("first").textContent).toContain("0");
	});

	it("optimistically adds and blocks duplicate mutation while pending", async () => {
		let resolveAdd: (() => void) | undefined;
		trpcMock.add.mockReturnValue(
			new Promise<void>((resolve) => {
				resolveAdd = resolve;
			}),
		);
		render(<Probe />);
		await waitFor(() => expect(trpcMock.list).toHaveBeenCalled());

		fireEvent.click(screen.getByRole("button", { name: "add" }));
		await waitFor(() =>
			expect(
				screen.getByRole<HTMLButtonElement>("button", { name: "remove" })
					.disabled,
			).toBe(true),
		);
		fireEvent.click(screen.getByRole("button", { name: "remove" }));
		expect(trpcMock.add).toHaveBeenCalledTimes(1);

		resolveAdd?.();
		await waitFor(() =>
			expect(
				screen.getByRole<HTMLButtonElement>("button", { name: "remove" })
					.disabled,
			).toBe(false),
		);
	});

	it("optimistically removes a saved paper", async () => {
		const remove = deferred<void>();
		trpcMock.list.mockResolvedValue({ items: [saved()], nextCursor: null });
		trpcMock.remove.mockReturnValue(remove.promise);
		render(<Probe />);
		fireEvent.click(await screen.findByRole("button", { name: "remove" }));

		await waitFor(() =>
			expect(
				screen.getByRole<HTMLButtonElement>("button", { name: "add" }).disabled,
			).toBe(true),
		);
		expect(trpcMock.remove).toHaveBeenCalledWith({ arxivId: paper.arxivId });
		remove.resolve();
	});

	it("rolls failed add and remove mutations back exactly", async () => {
		trpcMock.add.mockRejectedValueOnce(new Error("add failed"));
		const view = render(<Probe />);
		await waitFor(() => expect(trpcMock.list).toHaveBeenCalled());
		fireEvent.click(screen.getByRole("button", { name: "add" }));
		await waitFor(() =>
			expect(
				screen.getByRole<HTMLButtonElement>("button", { name: "add" }).disabled,
			).toBe(false),
		);

		cleanup();
		authMock.user = { id: `remove-${crypto.randomUUID()}` };
		trpcMock.list.mockResolvedValue({ items: [saved()], nextCursor: null });
		trpcMock.remove.mockRejectedValueOnce(new Error("remove failed"));
		view.unmount();
		render(<Probe />);
		fireEvent.click(await screen.findByRole("button", { name: "remove" }));
		await waitFor(() =>
			expect(
				screen.getByRole<HTMLButtonElement>("button", { name: "remove" })
					.disabled,
			).toBe(false),
		);
	});

	it("preserves exact metadata and ordering when a remove rolls back beside another mutation", async () => {
		const original = saved({
			abstract: "Original abstract",
			savedAt: "2026-01-02T03:04:05.000Z",
			summary: "Original summary",
		});
		const trailing = saved({
			arxivId: "2607.00003",
			savedAt: "2026-01-01T00:00:00.000Z",
			title: "Trailing Paper",
		});
		const remove = deferred<void>();
		const add = deferred<void>();
		trpcMock.list.mockResolvedValue({
			items: [original, trailing],
			nextCursor: null,
		});
		trpcMock.remove.mockReturnValue(remove.promise);
		trpcMock.add.mockReturnValue(add.promise);
		render(<Probe />);
		await screen.findByRole("button", { name: "remove" });

		fireEvent.click(screen.getByRole("button", { name: "remove" }));
		fireEvent.click(screen.getByRole("button", { name: "add second" }));
		add.resolve();
		remove.reject(new Error("remove failed"));

		await waitFor(() =>
			expect(screen.getByRole("button", { name: "remove" })).toBeTruthy(),
		);
		const items = JSON.parse(screen.getByTestId("items").textContent ?? "[]");
		expect(items).toHaveLength(3);
		expect(items.map((item: SavedPaper) => item.title)).toEqual([
			"Second Paper",
			"Test Paper",
			"Trailing Paper",
		]);
		expect(items[1]).toEqual(original);
	});

	it("rolls back only the failed concurrent add when cache starts undefined", async () => {
		const load = deferred<{ items: SavedPaper[]; nextCursor: null }>();
		const firstAdd = deferred<void>();
		const secondAdd = deferred<void>();
		trpcMock.list.mockReturnValue(load.promise);
		trpcMock.add
			.mockReturnValueOnce(firstAdd.promise)
			.mockReturnValueOnce(secondAdd.promise);
		render(<Probe />);
		await waitFor(() => expect(trpcMock.list).toHaveBeenCalledTimes(1));

		fireEvent.click(screen.getByRole("button", { name: "add" }));
		fireEvent.click(screen.getByRole("button", { name: "add second" }));
		await waitFor(() => expect(trpcMock.add).toHaveBeenCalledTimes(2));
		firstAdd.reject(new Error("first failed"));
		secondAdd.resolve();

		await waitFor(() => {
			const items = JSON.parse(screen.getByTestId("items").textContent ?? "[]");
			expect(items.map((item: SavedPaper) => item.arxivId)).toEqual([
				secondPaper.arxivId,
			]);
		});
		load.resolve({ items: [], nextCursor: null });
	});

	it("ignores stale load and mutation completions after sign-out", async () => {
		const load = deferred<{ items: SavedPaper[]; nextCursor: null }>();
		const add = deferred<void>();
		trpcMock.list.mockReturnValue(load.promise);
		trpcMock.add.mockReturnValue(add.promise);
		const view = render(<Probe />);
		await waitFor(() => expect(trpcMock.list).toHaveBeenCalled());
		fireEvent.click(screen.getByRole("button", { name: "add" }));

		authMock.user = null;
		view.rerender(<Probe />);
		load.resolve({ items: [saved()], nextCursor: null });
		add.resolve();

		await waitFor(() =>
			expect(screen.getByTestId("items").textContent).toBe("[]"),
		);
	});

	it("ignores stale load and mutation completions after a user switch", async () => {
		const oldLoad = deferred<{ items: SavedPaper[]; nextCursor: null }>();
		const oldAdd = deferred<void>();
		trpcMock.list.mockReturnValueOnce(oldLoad.promise);
		trpcMock.add.mockReturnValue(oldAdd.promise);
		const view = render(<Probe />);
		await waitFor(() => expect(trpcMock.list).toHaveBeenCalledTimes(1));
		fireEvent.click(screen.getByRole("button", { name: "add" }));

		authMock.user = { id: `new-${crypto.randomUUID()}` };
		trpcMock.list.mockResolvedValueOnce({
			items: [saved({ arxivId: "new-user-paper", title: "New User Paper" })],
			nextCursor: null,
		});
		view.rerender(<Probe />);
		await screen.findByText(/New User Paper/);
		oldLoad.resolve({ items: [saved()], nextCursor: null });
		oldAdd.resolve();

		await waitFor(() =>
			expect(screen.getByTestId("items").textContent).not.toContain(
				"Test Paper",
			),
		);
		expect(screen.getByTestId("items").textContent).toContain("New User Paper");
	});

	it("isolates stale completions when the same user signs out and reauthenticates", async () => {
		const oldLoad = deferred<{ items: SavedPaper[]; nextCursor: null }>();
		const sameUser = authMock.user;
		trpcMock.list.mockReturnValueOnce(oldLoad.promise);
		const view = render(<Probe />);
		await waitFor(() => expect(trpcMock.list).toHaveBeenCalledTimes(1));

		authMock.user = null;
		view.rerender(<Probe />);
		await waitFor(() =>
			expect(screen.getByTestId("first").dataset.canFavorite).toBe("false"),
		);
		authMock.user = sameUser;
		trpcMock.list.mockResolvedValueOnce({
			items: [saved({ arxivId: "reauth-paper", title: "Reauth Paper" })],
			nextCursor: null,
		});
		view.rerender(<Probe />);
		await screen.findByText(/Reauth Paper/);
		oldLoad.resolve({ items: [saved()], nextCursor: null });

		await waitFor(() =>
			expect(screen.getByTestId("items").textContent).not.toContain(
				"Test Paper",
			),
		);
	});
});
