import { TRPCClientError } from "@trpc/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const CLIENT_TRACE_ID = "0123456789abcdef0123456789abcdef";
const SERVER_TRACE_ID = "fedcba9876543210fedcba9876543210";

const loggerMock = vi.hoisted(() => ({
	logger: { error: vi.fn(() => "0123456789abcdef0123456789abcdef") },
}));

vi.mock("@hackerfeed/runtime/logger", () => loggerMock);

import { AiRequestError } from "#/lib/ai/client";
import {
	type ErrorNotice,
	getServerTraceId,
	onErrorNotice,
	reportError,
	toUserMessage,
} from "./report-error";

function trpcError(httpStatus: number) {
	return new TRPCClientError("procedure failed", {
		result: { error: { data: { httpStatus } } } as never,
		meta: {
			response: new Response(null, {
				status: httpStatus,
				headers: { "x-sentry-trace-id": SERVER_TRACE_ID },
			}),
		},
	});
}

afterEach(() => {
	vi.clearAllMocks();
});

describe("toUserMessage", () => {
	it("falls back to a message for what the user was doing", () => {
		expect(toUserMessage(trpcError(500), "save")).toBe(
			"Sorry, we couldn't save this.",
		);
		expect(toUserMessage(new Error("boom"), "load")).toBe(
			"Sorry, we couldn't load this.",
		);
		expect(toUserMessage(trpcError(500), "remove", "Couldn't clear.")).toBe(
			"Couldn't clear.",
		);
	});

	it("explains network, session and rate-limit failures", () => {
		const offline = TRPCClientError.from(new TypeError("Failed to fetch"));

		expect(toUserMessage(offline, "save")).toMatch(/couldn't reach/i);
		expect(toUserMessage(trpcError(401), "save")).toMatch(/sign in again/i);
		expect(toUserMessage(trpcError(429), "save")).toMatch(/too many/i);
	});

	it("keeps the server's own wording for AI errors", () => {
		const error = new AiRequestError(
			{ code: "model_unavailable", message: "That model is offline." },
			new Response(null, {
				status: 503,
				headers: { "x-sentry-trace-id": SERVER_TRACE_ID },
			}),
		);

		expect(toUserMessage(error, "load")).toBe("That model is offline.");
		expect(getServerTraceId(error)).toBe(SERVER_TRACE_ID);
	});
});

describe("reportError", () => {
	it("logs once and notifies with both trace IDs", () => {
		const notices: ErrorNotice[] = [];
		const unsubscribe = onErrorNotice((notice) => notices.push(notice));
		const error = trpcError(500);

		reportError("Favorite save failed", error, {
			action: "save",
			storyId: 7,
		});
		unsubscribe();

		expect(loggerMock.logger.error).toHaveBeenCalledWith(
			"Favorite save failed",
			{ storyId: 7, error, serverTraceId: SERVER_TRACE_ID },
		);
		expect(notices).toEqual([
			{
				id: expect.any(String),
				message: "Sorry, we couldn't save this.",
				serverTraceId: SERVER_TRACE_ID,
				clientTraceId: CLIENT_TRACE_ID,
			},
		]);
	});

	it("logs without notifying when the screen already shows the error", () => {
		const listener = vi.fn();
		const unsubscribe = onErrorNotice(listener);

		reportError("Feed load failed", new Error("boom"), {
			action: "load",
			notify: false,
		});
		unsubscribe();

		expect(loggerMock.logger.error).toHaveBeenCalledOnce();
		expect(listener).not.toHaveBeenCalled();
	});
});
