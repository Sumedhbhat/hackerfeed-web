import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TRACE_ID = "0123456789abcdef0123456789abcdef";

const sentry = vi.hoisted(() => ({
	captureException: vi.fn(),
	getActiveSpan: vi.fn(() => ({})),
	getClient: vi.fn(() => ({})),
	getCurrentScope: vi.fn(),
	logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
	setUser: vi.fn(),
	spanToJSON: vi.fn(() => ({ trace_id: TRACE_ID })),
}));

vi.mock("@sentry/core", () => sentry);

import { getTraceId, logger } from "./logger";

beforeEach(() => {
	vi.spyOn(console, "error").mockImplementation(() => undefined);
	vi.spyOn(console, "warn").mockImplementation(() => undefined);
	vi.spyOn(console, "info").mockImplementation(() => undefined);
});

afterEach(() => {
	vi.clearAllMocks();
	vi.restoreAllMocks();
});

describe("logger", () => {
	it("sends structured attributes to Sentry Logs and a JSON console line", () => {
		logger.info("feed loaded", { feed: "top", count: 30, skipped: undefined });

		expect(sentry.logger.info).toHaveBeenCalledWith("feed loaded", {
			feed: "top",
			count: 30,
		});
		const line = JSON.parse(vi.mocked(console.info).mock.calls[0][0]);
		expect(line).toMatchObject({
			level: "info",
			message: "feed loaded",
			traceId: TRACE_ID,
			feed: "top",
		});
	});

	it("records an issue for errors with a caught value and returns the trace ID", () => {
		const error = new Error("db down");

		const traceId = logger.error("favorites load failed", {
			error,
			storyId: 42,
		});

		expect(traceId).toBe(TRACE_ID);
		expect(sentry.captureException).toHaveBeenCalledWith(error, {
			extra: { storyId: 42, err: "db down" },
			tags: { log_message: "favorites load failed" },
		});
	});

	it("keeps warnings out of Sentry issues", () => {
		logger.warn("HN API network error", { error: new Error("offline") });

		expect(sentry.logger.warn).toHaveBeenCalledWith("HN API network error", {
			err: "offline",
		});
		expect(sentry.captureException).not.toHaveBeenCalled();
	});

	it("serializes non-primitive attributes", () => {
		logger.warn("odd", { detail: { a: 1 } });

		expect(sentry.logger.warn).toHaveBeenCalledWith("odd", {
			detail: '{"a":1}',
		});
	});
});

describe("getTraceId", () => {
	it("is undefined when Sentry isn't running", () => {
		sentry.getClient.mockReturnValueOnce(undefined as never);

		expect(getTraceId()).toBeUndefined();
	});
});
