import { describe, expect, it, vi } from "vitest";
import type { DatabaseContext } from "#/server/database/client";
import { createTrpcContextFromRequest } from "./context";

const database = {} as DatabaseContext;

function createRequest(headers: HeadersInit = {}) {
	return new Request("https://example.com/api/trpc", { headers });
}

describe("createTrpcContextFromRequest", () => {
	it("returns an unauthenticated context when the auth header is missing", async () => {
		await expect(
			createTrpcContextFromRequest(createRequest(), database, {
				getSession: vi.fn(async () => ({ user: null, sessionUser: null })),
			}),
		).resolves.toEqual({
			database,
			user: null,
		});
	});

	it("authenticates browser requests with the WorkOS session cookie", async () => {
		const getSession = vi.fn(async () => ({
			sessionUser: {
				id: "cookie-workos-user",
				email: "user@example.com",
				firstName: null,
				lastName: null,
				profilePictureUrl: null,
			},
			user: { workosUserId: "cookie-workos-user" },
		}));

		const request = createRequest({
			Cookie: "hackerfeed_session=sealed-session",
		});

		await expect(
			createTrpcContextFromRequest(request, database, { getSession }),
		).resolves.toEqual({
			database,
			user: { workosUserId: "cookie-workos-user" },
		});
		expect(getSession).toHaveBeenCalledWith(request);
	});

	it("authenticates valid bearer tokens with the injected verifier", async () => {
		const verifyAccessToken = vi.fn(async () => ({
			workosUserId: "verified-workos-user",
		}));
		const getSession = vi.fn(async () => ({
			user: { workosUserId: "cookie-workos-user" },
			sessionUser: {
				id: "cookie-workos-user",
				email: "user@example.com",
				firstName: null,
				lastName: null,
				profilePictureUrl: null,
			},
		}));

		await expect(
			createTrpcContextFromRequest(
				createRequest({ Authorization: "Bearer token-123" }),
				database,
				{ getSession, verifyAccessToken },
			),
		).resolves.toEqual({
			database,
			user: { workosUserId: "verified-workos-user" },
		});
		expect(verifyAccessToken).toHaveBeenCalledWith("token-123");
		expect(getSession).not.toHaveBeenCalled();
	});

	it("returns an unauthenticated context when verification fails", async () => {
		await expect(
			createTrpcContextFromRequest(
				createRequest({ Authorization: "Bearer token-123" }),
				database,
				{ verifyAccessToken: vi.fn(async () => null) },
			),
		).resolves.toEqual({
			database,
			user: null,
		});
	});

	it("does not trust x-workos-user-id without a bearer token", async () => {
		await expect(
			createTrpcContextFromRequest(
				createRequest({ "x-workos-user-id": "spoofed-user" }),
				database,
				{
					getSession: vi.fn(async () => ({ user: null, sessionUser: null })),
				},
			),
		).resolves.toEqual({
			database,
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
				database,
				{
					verifyAccessToken: vi.fn(async () => ({
						workosUserId: "verified-workos-user",
					})),
				},
			),
		).resolves.toEqual({
			database,
			user: { workosUserId: "verified-workos-user" },
		});
	});
});
