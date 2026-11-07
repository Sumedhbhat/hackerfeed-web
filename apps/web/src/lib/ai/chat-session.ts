import type { ChatMessage } from "@hackerfeed/contracts/ai";

/**
 * A story's AI conversation, kept for the browser session so stepping out to
 * the HN comments and back doesn't lose it. One conversation per story and
 * assistant; closing the tab ends it.
 */
export function storyChatStorageKey(storyId: number, providerId: string) {
	return `hackerfeed:story-chat:${storyId}:${providerId}`;
}

function isChatMessage(value: unknown): value is ChatMessage {
	if (typeof value !== "object" || value === null) return false;
	const { role, content } = value as Record<string, unknown>;
	return (
		(role === "user" || role === "assistant") && typeof content === "string"
	);
}

/** The saved conversation, or none if there isn't one or it can't be read. */
export function loadStoryChat(key: string): ChatMessage[] {
	try {
		const parsed: unknown = JSON.parse(sessionStorage.getItem(key) ?? "[]");
		return Array.isArray(parsed) ? parsed.filter(isChatMessage) : [];
	} catch {
		return [];
	}
}

/** Saves the conversation; an empty one clears the entry. */
export function saveStoryChat(key: string, messages: ChatMessage[]) {
	try {
		if (messages.length === 0) sessionStorage.removeItem(key);
		else sessionStorage.setItem(key, JSON.stringify(messages));
	} catch {
		// Storage can be full or blocked (private mode); the chat still works.
	}
}
