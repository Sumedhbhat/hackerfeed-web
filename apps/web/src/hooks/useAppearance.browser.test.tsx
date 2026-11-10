import {
	type Account,
	BUILT_IN_PALETTES,
	DEFAULT_PALETTE,
} from "@hackerfeed/contracts/appearance";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	appearanceStore,
	DEFAULT_APPEARANCE,
	LEGACY_MODE_KEY,
	showAppearance,
} from "#/lib/appearance/appearance";
import { useAppearance, useAppearanceSync } from "./useAppearance";

const ember = BUILT_IN_PALETTES[1];
const authMock = vi.hoisted(() => ({
	isLoading: false,
	user: { id: "reader" } as { id: string } | null,
}));
const trpcMock = vi.hoisted(() => ({ me: vi.fn(), update: vi.fn() }));

vi.mock("#/hooks/useAuthSession", () => ({ useAuthSession: () => authMock }));
vi.mock("#/lib/trpc/client", () => ({
	createTrpcClient: () => ({
		account: { me: { query: trpcMock.me } },
		preferences: { update: { mutate: trpcMock.update } },
	}),
}));

const account = (preferences: Partial<Account["preferences"]>): Account => ({
	preferences: {
		mode: "auto",
		palette: DEFAULT_PALETTE,
		saved: true,
		...preferences,
	},
});

function renderAppearance() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return renderHook(
		() => {
			useAppearanceSync();
			return useAppearance();
		},
		{
			wrapper: ({ children }: { children: ReactNode }) => (
				<QueryClientProvider client={queryClient}>
					{children}
				</QueryClientProvider>
			),
		},
	);
}

const shownMode = () => document.documentElement.getAttribute("data-theme");

beforeEach(() => {
	authMock.user = { id: "reader" };
	trpcMock.me.mockReset().mockResolvedValue(account({}));
	trpcMock.update.mockReset().mockResolvedValue(account({}));
	showAppearance(DEFAULT_APPEARANCE);
	window.localStorage.clear();
});
afterEach(cleanup);

describe("useAppearanceSync", () => {
	it("shows this device's cached look first, then the account's, which wins", async () => {
		showAppearance({ mode: "light", palette: DEFAULT_PALETTE });
		appearanceStore.setState(() => DEFAULT_APPEARANCE);
		trpcMock.me.mockResolvedValue(account({ mode: "dark", palette: ember }));

		const { result } = renderAppearance();

		expect(result.current.mode).toBe("light");
		await waitFor(() => expect(result.current.mode).toBe("dark"));
		expect(result.current.palette).toEqual(ember);
		expect(shownMode()).toBe("dark");
	});

	it("keeps the cached look when the account can't be loaded", async () => {
		showAppearance({ mode: "dark", palette: ember });
		trpcMock.me.mockRejectedValue(new Error("offline"));

		const { result } = renderAppearance();

		await waitFor(() => expect(trpcMock.me).toHaveBeenCalled());
		expect(result.current).toMatchObject({ mode: "dark", palette: ember });
	});

	it("moves this browser's old mode to an account with no preferences, once", async () => {
		window.localStorage.setItem(LEGACY_MODE_KEY, "dark");
		trpcMock.me.mockResolvedValue(account({ saved: false }));
		trpcMock.update.mockResolvedValue(account({ mode: "dark" }));

		const { result } = renderAppearance();

		await waitFor(() => expect(result.current.mode).toBe("dark"));
		expect(trpcMock.update).toHaveBeenCalledExactlyOnceWith({ mode: "dark" });
		expect(window.localStorage.getItem(LEGACY_MODE_KEY)).toBeNull();
	});

	it("drops the old mode when the account already has preferences", async () => {
		window.localStorage.setItem(LEGACY_MODE_KEY, "dark");
		trpcMock.me.mockResolvedValue(account({ mode: "light" }));

		const { result } = renderAppearance();

		await waitFor(() =>
			expect(window.localStorage.getItem(LEGACY_MODE_KEY)).toBeNull(),
		);
		expect(result.current.mode).toBe("light");
		expect(trpcMock.update).not.toHaveBeenCalled();
	});
});

describe("useAppearance", () => {
	it("shows a change at once and saves only what changed", async () => {
		trpcMock.update.mockResolvedValue(account({ palette: ember }));
		const { result } = renderAppearance();
		await waitFor(() => expect(trpcMock.me).toHaveBeenCalled());

		act(() => result.current.setPalette(ember));

		expect(result.current.palette).toEqual(ember);
		await waitFor(() =>
			expect(trpcMock.update).toHaveBeenCalledWith({ paletteId: "ember" }),
		);
	});

	it("puts the old look back when the save fails", async () => {
		trpcMock.update.mockRejectedValue(new Error("offline"));
		const { result } = renderAppearance();
		await waitFor(() => expect(trpcMock.me).toHaveBeenCalled());

		act(() => result.current.setMode("dark"));
		expect(shownMode()).toBe("dark");

		await waitFor(() => expect(result.current.mode).toBe("auto"));
		expect(shownMode()).toBeNull();
	});

	it("changes only this device when signed out", () => {
		authMock.user = null;
		const { result } = renderAppearance();

		act(() => result.current.setMode("dark"));

		expect(result.current.mode).toBe("dark");
		expect(trpcMock.me).not.toHaveBeenCalled();
		expect(trpcMock.update).not.toHaveBeenCalled();
	});
});
