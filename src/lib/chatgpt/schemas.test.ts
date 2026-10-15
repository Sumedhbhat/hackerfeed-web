import { describe, expect, it } from "vitest";
import {
	MAX_CHAT_MESSAGE_LENGTH,
	MAX_CHAT_MESSAGES,
	storyChatRequestSchema,
} from "./schemas";

const valid = {
	storyId: 1,
	model: "gpt-test",
	messages: [
		{ role: "user", content: "Hi" },
		{ role: "assistant", content: "Hello" },
		{ role: "user", content: "Explain" },
	],
};

describe("storyChatRequestSchema", () => {
	it("accepts a multi-turn conversation ending with the user", () => {
		expect(storyChatRequestSchema.parse(valid)).toEqual(valid);
	});

	it("trims message content and the model", () => {
		const parsed = storyChatRequestSchema.parse({
			...valid,
			model: " gpt-test ",
			messages: [{ role: "user", content: "  hi  " }],
		});

		expect(parsed.model).toBe("gpt-test");
		expect(parsed.messages[0]?.content).toBe("hi");
	});

	it("enforces limits", () => {
		const many = Array.from({ length: MAX_CHAT_MESSAGES + 1 }, () => ({
			role: "user",
			content: "x",
		}));

		expect(
			storyChatRequestSchema.safeParse({ ...valid, messages: many }).success,
		).toBe(false);
		expect(
			storyChatRequestSchema.safeParse({
				...valid,
				messages: [
					{ role: "user", content: "x".repeat(MAX_CHAT_MESSAGE_LENGTH + 1) },
				],
			}).success,
		).toBe(false);
	});

	it.each([
		["a fractional story id", { storyId: 1.5 }],
		["a system role", { messages: [{ role: "system", content: "x" }] }],
		["a developer role", { messages: [{ role: "developer", content: "x" }] }],
		[
			"an assistant final message",
			{ messages: [{ role: "assistant", content: "x" }] },
		],
	])("rejects %s", (_label, overrides) => {
		expect(
			storyChatRequestSchema.safeParse({ ...valid, ...overrides }).success,
		).toBe(false);
	});
});
