import { describe, expect, it } from "vitest";
import {
	ChatGptError,
	ChatGptNotConnectedError,
	requiresReauthentication,
	toChatGptError,
} from "./errors";

describe("toChatGptError", () => {
	it("reads OAuth-style string error codes", () => {
		const error = toChatGptError({ error: "invalid_grant" }, 400);

		expect(error.code).toBe("invalid_grant");
		expect(error.message).toMatch(/reconnect/i);
		expect(error.status).toBe(400);
	});

	it("reads nested Responses API error codes", () => {
		const error = toChatGptError(
			{ error: { code: "subscription_sharing_usage_limit_exceeded" } },
			429,
		);

		expect(error.code).toBe("subscription_sharing_usage_limit_exceeded");
		expect(error.message).toMatch(/usage limit/i);
		expect(error.retryable).toBe(false);
	});

	it("reads codes nested in a failed response event", () => {
		const error = toChatGptError({
			response: { error: { code: "subscription_sharing_usage_unavailable" } },
		});

		expect(error.code).toBe("subscription_sharing_usage_unavailable");
		expect(error.retryable).toBe(true);
	});

	it("never forwards server-provided messages", () => {
		const error = toChatGptError(
			{ error: { code: "weird_code", message: "echo of the user's secret" } },
			400,
		);

		expect(error.message).not.toContain("secret");
		expect(error.code).toBe("weird_code");
	});

	it("sanitizes unsafe codes", () => {
		expect(toChatGptError({ error: "<script>" }).code).toBe("api_error");
	});

	it.each([
		[401, "api_error", false, /reconnect/i],
		[429, "api_error", true, /too many requests/i],
		[503, "api_error", true, /temporarily unavailable/i],
		[400, "api_error", false, /couldn't complete/i],
	])("maps status %i with no code", (status, code, retryable, message) => {
		const error = toChatGptError(null, status);

		expect(error.code).toBe(code);
		expect(error.retryable).toBe(retryable);
		expect(error.message).toMatch(message);
	});
});

describe("requiresReauthentication", () => {
	it.each([
		"invalid_grant",
		"invalid_refresh_token",
		"refresh_token_expired",
		"refresh_token_reused",
	])("is true for %s", (code) => {
		expect(requiresReauthentication(new ChatGptError(code, "x"))).toBe(true);
	});

	it("is false for other errors", () => {
		expect(
			requiresReauthentication(new ChatGptError("network_error", "x")),
		).toBe(false);
		expect(requiresReauthentication(new Error("invalid_grant"))).toBe(false);
	});
});

describe("ChatGptError", () => {
	it("serializes only safe fields", () => {
		const error = new ChatGptError("code", "message", {
			retryable: true,
			status: 502,
		});

		expect(JSON.parse(JSON.stringify(error))).toEqual({
			code: "code",
			message: "message",
			retryable: true,
		});
	});

	it("has a dedicated not-connected error", () => {
		const error = new ChatGptNotConnectedError();

		expect(error).toBeInstanceOf(ChatGptError);
		expect(error.code).toBe("chatgpt_not_connected");
	});
});
