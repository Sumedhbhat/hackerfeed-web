import { afterEach, describe, expect, it } from "vitest";
import {
	loadStoryChat,
	saveStoryChat,
	storyChatStorageKey,
} from "./chat-session";

afterEach(() => sessionStorage.clear());

describe("story chat session", () => {
	const key = storyChatStorageKey(42, "openai");

	it("round-trips a conversation per story and assistant", () => {
		saveStoryChat(key, [
			{ role: "user", content: "Why?" },
			{ role: "assistant", content: "Because." },
		]);

		expect(loadStoryChat(key)).toEqual([
			{ role: "user", content: "Why?" },
			{ role: "assistant", content: "Because." },
		]);
		expect(loadStoryChat(storyChatStorageKey(42, "anthropic"))).toEqual([]);
	});

	it("clears the entry when the conversation is reset", () => {
		saveStoryChat(key, [{ role: "user", content: "Hi" }]);
		saveStoryChat(key, []);

		expect(sessionStorage.getItem(key)).toBeNull();
	});

	it("ignores stored values that aren't a conversation", () => {
		sessionStorage.setItem(key, "{not json");
		expect(loadStoryChat(key)).toEqual([]);

		sessionStorage.setItem(
			key,
			JSON.stringify([
				{ role: "system", content: "x" },
				{ role: "user", content: "ok" },
			]),
		);
		expect(loadStoryChat(key)).toEqual([{ role: "user", content: "ok" }]);
	});
});
