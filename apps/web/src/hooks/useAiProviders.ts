import { AiRequestError } from "@hackerfeed/api-client/ai";
import type { ChatMessage } from "@hackerfeed/contracts/ai";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	loadStoryChat,
	saveStoryChat,
	storyChatStorageKey,
} from "#/lib/ai/chat-session";
import {
	disconnectAiProvider,
	fetchAiModels,
	fetchAiProviders,
	streamStoryChat,
} from "#/lib/ai/client";
import { useAuthSession } from "./useAuthSession";

export type StoryChatMessage = ChatMessage & { incomplete?: boolean };

const PROVIDERS_QUERY_KEY = ["ai", "providers"] as const;
const modelsQueryKey = (providerId: string) =>
	["ai", "providers", providerId, "models"] as const;

/** The AI provider catalog with the signed-in user's connection state. */
export function useAiProviders() {
	const { user, isLoading } = useAuthSession();
	const query = useQuery({
		queryKey: PROVIDERS_QUERY_KEY,
		queryFn: fetchAiProviders,
		enabled: Boolean(user),
		staleTime: 60_000,
	});

	return {
		...query,
		isLoading: isLoading || (Boolean(user) && query.isPending),
		isSignedIn: Boolean(user),
	};
}

export function useAiModels(providerId: string | undefined) {
	return useQuery({
		queryKey: modelsQueryKey(providerId ?? ""),
		queryFn: () => fetchAiModels(providerId ?? ""),
		enabled: Boolean(providerId),
		staleTime: 10 * 60_000,
	});
}

export function useDisconnectAiProvider() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: disconnectAiProvider,
		// AiProviderRow shows this failure on the row.
		meta: { notifyOnError: false },
		onSuccess: (_data, providerId) => {
			queryClient.removeQueries({ queryKey: modelsQueryKey(providerId) });
			return queryClient.invalidateQueries({ queryKey: PROVIDERS_QUERY_KEY });
		},
	});
}

export type StoryChatError = {
	code: string;
	message: string;
	retryable: boolean;
};

function toStoryChatError(error: unknown): StoryChatError {
	if (error instanceof AiRequestError) {
		return {
			code: error.code,
			message: error.message,
			retryable: error.retryable,
		};
	}
	return {
		code: "network_error",
		message: "Couldn't reach HackerFeed. Check your connection and try again.",
		retryable: true,
	};
}

export function useStoryChat(
	storyId: number,
	providerId: string | undefined,
	model: string | undefined,
) {
	const queryClient = useQueryClient();
	const [messages, setMessages] = useState<StoryChatMessage[]>([]);
	const [streamingText, setStreamingText] = useState<string | null>(null);
	const [error, setError] = useState<StoryChatError | null>(null);
	const abortRef = useRef<AbortController | null>(null);
	// Bumped by reset() so a cancelled stream can't write into a fresh chat.
	const generationRef = useRef(0);

	useEffect(() => () => abortRef.current?.abort(), []);

	// `loadedKey` stops the previous assistant's messages being written under
	// the new key in the render before the load lands.
	const storageKey = providerId
		? storyChatStorageKey(storyId, providerId)
		: null;
	const [loadedKey, setLoadedKey] = useState<string | null>(null);
	useEffect(() => {
		if (!storageKey) return;
		setMessages(loadStoryChat(storageKey));
		setLoadedKey(storageKey);
	}, [storageKey]);
	useEffect(() => {
		if (storageKey && loadedKey === storageKey) {
			saveStoryChat(storageKey, messages);
		}
	}, [messages, storageKey, loadedKey]);

	const run = useCallback(
		async (history: StoryChatMessage[]) => {
			if (!providerId || !model) return;
			const controller = new AbortController();
			const generation = generationRef.current;
			abortRef.current = controller;
			setMessages(history);
			setError(null);
			setStreamingText("");

			let reply = "";
			let failed = false;
			try {
				await streamStoryChat(
					{
						providerId,
						storyId,
						model,
						messages: history.map(({ role, content }) => ({ role, content })),
					},
					{
						signal: controller.signal,
						onDelta: (text) => {
							reply += text;
							setStreamingText(reply);
						},
					},
				);
			} catch (caught) {
				if (
					!controller.signal.aborted &&
					generation === generationRef.current
				) {
					failed = true;
					const chatError = toStoryChatError(caught);
					setError(chatError);
					if (chatError.code === "provider_not_connected") {
						void queryClient.invalidateQueries({
							queryKey: PROVIDERS_QUERY_KEY,
						});
					}
				}
			} finally {
				if (abortRef.current === controller) abortRef.current = null;
				if (generation === generationRef.current) {
					// Keep partial text so an interrupted answer isn't lost.
					if (reply.trim()) {
						setMessages([
							...history,
							{
								role: "assistant",
								content: reply,
								...(failed ? { incomplete: true } : {}),
							},
						]);
					}
					setStreamingText(null);
				}
			}
		},
		[model, providerId, queryClient, storyId],
	);

	const send = useCallback(
		(content: string) => {
			const trimmed = content.trim();
			if (!trimmed || abortRef.current) return;
			setCleared(null);
			void run([...messages, { role: "user", content: trimmed }]);
		},
		[messages, run],
	);

	const retry = useCallback(() => {
		if (abortRef.current) return;
		const last = messages.at(-1);
		if (last?.role === "user") void run(messages);
		else if (last?.incomplete) void run(messages.slice(0, -1));
	}, [messages, run]);

	const stop = useCallback(() => abortRef.current?.abort(), []);

	const [cleared, setCleared] = useState<StoryChatMessage[] | null>(null);

	const reset = useCallback(() => {
		generationRef.current += 1;
		abortRef.current?.abort();
		abortRef.current = null;
		setCleared(messages.length > 0 ? messages : null);
		setMessages([]);
		setStreamingText(null);
		setError(null);
	}, [messages]);

	const undoReset = useCallback(() => {
		if (!cleared) return;
		setMessages(cleared);
		setCleared(null);
	}, [cleared]);

	return {
		error,
		isStreaming: streamingText !== null,
		messages,
		reset,
		undoReset,
		retry,
		send,
		stop,
		streamingText,
	};
}
