import { describe, expect, it, vi } from "vitest";
import { createTrpcContextFromRequest } from "./context";

function createRequest(headers: HeadersInit = {}) {
	return new Request("https://example.com/api/trpc", { headers });
}

describe("createTrpcContextFromRequest", () => {
	it("returns an unauthenticated context when the auth header is missing", async () => {
		await expect(
			createTrpcContextFromRequest(createRequest()),
		).resolves.toEqual({
			user: null,
		});
	});

	it("authenticates valid bearer tokens with the injected verifier", async () => {
		const verifyAccessToken = vi.fn(async () => ({
			workosUserId: "verified-workos-user",
		}));

		await expect(
			createTrpcContextFromRequest(
				createRequest({ Authorization: "Bearer token-123" }),
				{ verifyAccessToken },
			),
		).resolves.toEqual({
			user: { workosUserId: "verified-workos-user" },
		});
		expect(verifyAccessToken).toHaveBeenCalledWith("token-123");
	});

	it("returns an unauthenticated context when verification fails", async () => {
		await expect(
			createTrpcContextFromRequest(
				createRequest({ Authorization: "Bearer token-123" }),
				{ verifyAccessToken: vi.fn(async () => null) },
			),
		).resolves.toEqual({
			user: null,
		});
	});

	it("does not trust x-workos-user-id without a bearer token", async () => {
		await expect(
			createTrpcContextFromRequest(
				createRequest({ "x-workos-user-id": "spoofed-user" }),
			),
		).resolves.toEqual({
			user: null,
		});
	});

	it("does not let x-workos-user-id override the verified bearer identity", async () => {
		await expect(
			createTrpcContextFromRequest(
				createRequest({
					Authorization: "Bearer token-123",
					"x-workos-user-id": "spoofed-user",
				}),
				{
					verifyAccessToken: vi.fn(async () => ({
						workosUserId: "verified-workos-user",
					})),
				},
			),
		).resolves.toEqual({
			user: { workosUserId: "verified-workos-user" },
		});
	});
});
