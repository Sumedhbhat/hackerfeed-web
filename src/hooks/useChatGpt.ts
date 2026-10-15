import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	ChatGptRequestError,
	disconnectChatGpt,
	fetchChatGptModels,
	fetchChatGptStatus,
	streamStoryChat,
} from "#/lib/chatgpt/client";
import type { ChatMessage } from "#/lib/chatgpt/schemas";
import { useAuthSession } from "./useAuthSession";

const STATUS_QUERY_KEY = ["chatgpt", "status"] as const;
const MODELS_QUERY_KEY = ["chatgpt", "models"] as const;

export function useChatGptStatus() {
	const { user, isLoading } = useAuthSession();
	const query = useQuery({
		queryKey: STATUS_QUERY_KEY,
		queryFn: fetchChatGptStatus,
		enabled: Boolean(user),
		staleTime: 60_000,
	});

	return {
		...query,
		isLoading: isLoading || (Boolean(user) && query.isPending),
		isSignedIn: Boolean(user),
	};
}

export function useChatGptModels(enabled: boolean) {
	return useQuery({
		queryKey: MODELS_QUERY_KEY,
		queryFn: fetchChatGptModels,
		enabled,
		staleTime: 10 * 60_000,
	});
}

export function useDisconnectChatGpt() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: disconnectChatGpt,
		onSuccess: () => {
			queryClient.removeQueries({ queryKey: MODELS_QUERY_KEY });
			return queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY });
		},
	});
}

export type StoryChatError = {
	code: string;
	message: string;
	retryable: boolean;
};

function toStoryChatError(error: unknown): StoryChatError {
	if (error instanceof ChatGptRequestError) {
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

/** Holds one in-memory conversation about a story and streams replies into it. */
export function useStoryChat(storyId: number, model: string | undefined) {
	const queryClient = useQueryClient();
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [streamingText, setStreamingText] = useState<string | null>(null);
	const [error, setError] = useState<StoryChatError | null>(null);
	const abortRef = useRef<AbortController | null>(null);
	// Bumped by reset() so a cancelled stream can't write into a fresh chat.
	const generationRef = useRef(0);

	useEffect(() => () => abortRef.current?.abort(), []);

	const run = useCallback(
		async (history: ChatMessage[]) => {
			if (!model) return;
			const controller = new AbortController();
			const generation = generationRef.current;
			abortRef.current = controller;
			setMessages(history);
			setError(null);
			setStreamingText("");

			let reply = "";
			try {
				await streamStoryChat(
					{ storyId, model, messages: history },
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
					const chatError = toStoryChatError(caught);
					setError(chatError);
					if (chatError.code === "chatgpt_not_connected") {
						void queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY });
					}
				}
			} finally {
				if (abortRef.current === controller) abortRef.current = null;
				if (generation === generationRef.current) {
					// Keep partial text so an interrupted answer isn't lost.
					if (reply.trim()) {
						setMessages([...history, { role: "assistant", content: reply }]);
					}
					setStreamingText(null);
				}
			}
		},
		[model, queryClient, storyId],
	);

	const send = useCallback(
		(content: string) => {
			const trimmed = content.trim();
			if (!trimmed || abortRef.current) return;
			void run([...messages, { role: "user", content: trimmed }]);
		},
		[messages, run],
	);

	/** Re-sends the conversation when the last reply failed before any text arrived. */
	const retry = useCallback(() => {
		if (abortRef.current || messages.at(-1)?.role !== "user") return;
		void run(messages);
	}, [messages, run]);

	const stop = useCallback(() => abortRef.current?.abort(), []);

	const reset = useCallback(() => {
		generationRef.current += 1;
		abortRef.current?.abort();
		abortRef.current = null;
		setMessages([]);
		setStreamingText(null);
		setError(null);
	}, []);

	return {
		error,
		isStreaming: streamingText !== null,
		messages,
		reset,
		retry,
		send,
		stop,
		streamingText,
	};
}
