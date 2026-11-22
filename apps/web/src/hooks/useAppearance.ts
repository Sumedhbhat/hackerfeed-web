import {
	BUILT_IN_PALETTES,
	type Palette,
	type PaletteInput,
	type PreferencesUpdateInput,
	type ThemeMode,
} from "@hackerfeed/entities/appearance";
import {
	type ChatProviderId,
	DEFAULT_CHAT_PROVIDER,
} from "@hackerfeed/entities/chat-providers";
import {
	useIsMutating,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import { useEffect, useLayoutEffect, useRef } from "react";
import {
	type Appearance,
	appearanceStore,
	forgetLegacyMode,
	readCachedAppearance,
	readLegacyMode,
	showAppearance,
} from "#/lib/appearance/appearance";
import { createTrpcClient } from "#/lib/trpc/client";
import { useAuthSession } from "./useAuthSession";

const accountQueryKey = (userId: string | undefined) =>
	["account", userId ?? null] as const;

/** What HackerFeed stores about the signed-in reader. Refetched on window focus, so a change made on another device shows up here. */
export function useAccount() {
	const { user } = useAuthSession();
	return useQuery({
		queryKey: accountQueryKey(user?.id),
		queryFn: () => createTrpcClient().account.me.query(),
		enabled: Boolean(user),
		retry: 1,
	});
}

const SAVE_MUTATION_KEY = ["preferences", "update"] as const;

type SaveVariables = {
	changes: PreferencesUpdateInput;
	previous: Appearance;
	previousChatProvider?: ChatProviderId;
};

export const chatProviderStore = new Store<ChatProviderId>(
	DEFAULT_CHAT_PROVIDER,
);

function useSavePreferences() {
	const { user } = useAuthSession();
	const queryClient = useQueryClient();
	const queryKey = accountQueryKey(user?.id);
	return useMutation({
		mutationKey: SAVE_MUTATION_KEY,
		// One save at a time, in the order they were made, so the last choice wins.
		scope: { id: "preferences" },
		mutationFn: ({ changes }: SaveVariables) =>
			createTrpcClient().preferences.update.mutate(changes),
		// An account fetch already on its way would bring back the old choice.
		onMutate: () => queryClient.cancelQueries({ queryKey }),
		onSuccess: (account) => queryClient.setQueryData(queryKey, account),
		onError: (_error, { previous, previousChatProvider }) => {
			showAppearance(previous);
			if (previousChatProvider)
				chatProviderStore.setState(() => previousChatProvider);
			return queryClient.invalidateQueries({ queryKey });
		},
	});
}

export type UseAppearanceReturn = Appearance & {
	setMode: (mode: ThemeMode) => void;
	setPalette: (palette: Palette) => void;
};

/** The mode and palette on screen. Changes show at once and are saved to the account; a failed save puts the old look back. */
export function useAppearance(): UseAppearanceReturn {
	const appearance = useStore(appearanceStore, (state) => state);
	const { user } = useAuthSession();
	const save = useSavePreferences();

	function change(next: Appearance, changes: PreferencesUpdateInput) {
		const previous = appearanceStore.state;
		showAppearance(next);
		if (user) save.mutate({ changes, previous });
	}

	return {
		...appearance,
		setMode: (mode) => change({ ...appearanceStore.state, mode }, { mode }),
		setPalette: (palette) =>
			change({ ...appearanceStore.state, palette }, { paletteId: palette.id }),
	};
}

/** The AI chat that story and paper links open. A change shows at once and is saved to the account; a failed save puts the old one back. */
export function useChatProvider() {
	const chatProvider = useStore(chatProviderStore, (state) => state);
	const { user } = useAuthSession();
	const save = useSavePreferences();

	return {
		chatProvider,
		setChatProvider(next: ChatProviderId) {
			const previousChatProvider = chatProviderStore.state;
			chatProviderStore.setState(() => next);
			if (user)
				save.mutate({
					changes: { chatProvider: next },
					previous: appearanceStore.state,
					previousChatProvider,
				});
		},
	};
}

/** Mounted once at the root: shows this device's cached look, then the account's, which always wins. */
export function useAppearanceSync() {
	const { data: account } = useAccount();
	const save = useSavePreferences();
	const migrated = useRef(false);

	useLayoutEffect(() => {
		const cached = readCachedAppearance();
		if (cached) showAppearance(cached);
	}, []);

	// An account fetched before a change was saved must not undo that change.
	const saving = useIsMutating({ mutationKey: SAVE_MUTATION_KEY }) > 0;
	useLayoutEffect(() => {
		if (!account || saving) return;
		showAppearance(account.preferences);
		chatProviderStore.setState(() => account.preferences.chatProvider);
	}, [account, saving]);

	// The mode used to live only in this browser. Move it to an account that
	// has no preferences yet, once.
	const { mutate } = save;
	useEffect(() => {
		if (!account || migrated.current) return;
		migrated.current = true;
		const legacyMode = readLegacyMode();
		if (!legacyMode) return;
		if (account.preferences.saved) forgetLegacyMode();
		else
			mutate(
				{ changes: { mode: legacyMode }, previous: appearanceStore.state },
				{ onSuccess: forgetLegacyMode },
			);
	}, [account, mutate]);
}

/** The built-in palettes plus the reader's own, with the calls that change the reader's own. */
export function usePalettes() {
	const { user } = useAuthSession();
	const queryClient = useQueryClient();
	const queryKey = ["palettes", user?.id ?? null] as const;
	const refresh = () => queryClient.invalidateQueries({ queryKey });

	const { data } = useQuery({
		queryKey,
		queryFn: () => createTrpcClient().palettes.list.query(),
		enabled: Boolean(user),
	});
	const save = useMutation({
		mutationFn: ({ id, ...palette }: PaletteInput & { id?: string }) =>
			id
				? createTrpcClient().palettes.update.mutate({ id, ...palette })
				: createTrpcClient().palettes.create.mutate(palette),
		onSuccess: refresh,
	});
	const remove = useMutation({
		mutationFn: (id: string) =>
			createTrpcClient().palettes.delete.mutate({ id }),
		meta: { errorAction: "remove" },
		// Deleting the palette in use puts the account back on the default.
		onSuccess: () =>
			Promise.all([
				refresh(),
				queryClient.invalidateQueries({
					queryKey: accountQueryKey(user?.id),
				}),
			]),
	});

	return { palettes: data ?? BUILT_IN_PALETTES, save, remove };
}
