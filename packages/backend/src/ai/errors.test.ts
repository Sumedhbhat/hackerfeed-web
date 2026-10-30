import { describe, expect, it } from "vitest";
import {
	AiProviderError,
	AiProviderNotConnectedError,
	AiProviderNotFoundError,
	networkError,
} from "./errors";

describe("AiProviderError", () => {
	it("defaults to non-retryable without reconnect", () => {
		const error = new AiProviderError("code", "message");

		expect(error.retryable).toBe(false);
		expect(error.requiresReconnect).toBe(false);
		expect(error.status).toBeUndefined();
	});

	it("serializes only user-safe fields", () => {
		const error = new AiProviderError("code", "message", {
			retryable: true,
			requiresReconnect: true,
			status: 502,
		});

		expect(JSON.parse(JSON.stringify(error))).toEqual({
			code: "code",
			message: "message",
			retryable: true,
		});
	});

	it("names the provider in not-connected and network errors", () => {
		const notConnected = new AiProviderNotConnectedError("Claude");
		const network = networkError("Claude");

		expect(notConnected).toBeInstanceOf(AiProviderError);
		expect(notConnected.code).toBe("provider_not_connected");
		expect(notConnected.message).toContain("Connect Claude");
		expect(network.code).toBe("network_error");
		expect(network.retryable).toBe(true);
		expect(network.message).toContain("Claude");
	});

	it("has a not-found error", () => {
		expect(new AiProviderNotFoundError().code).toBe("provider_not_found");
	});
});
