import { describe, expect, it } from "vitest";
import type { DatabaseContext } from "../database/client";
import { createTrpcContext } from "./context";
import { createAppRouter } from "./router";

const currentUser = { workosUserId: "workos-user-1" };

function createHarness() {
	const database = {} as DatabaseContext;
	const calls: Array<{ user: unknown; utcOffsetMinutes: number }> = [];
	const router = createAppRouter(
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		{
			async listReadingDays(user, utcOffsetMinutes) {
				calls.push({ user, utcOffsetMinutes });
				return [{ date: "2026-11-20", stories: 2, papers: 1 }];
			},
		},
	);
	const caller = (user: typeof currentUser | null) =>
		router.createCaller(createTrpcContext({ database, user }));

	return { calls, caller };
}

describe("analytics tRPC router", () => {
	it("returns the signed-in reader's reading days", async () => {
		const { calls, caller } = createHarness();

		await expect(
			caller(currentUser).analytics.readingDays({ utcOffsetMinutes: 330 }),
		).resolves.toEqual([{ date: "2026-11-20", stories: 2, papers: 1 }]);
		expect(calls).toEqual([{ user: currentUser, utcOffsetMinutes: 330 }]);
	});

	it("requires a session", async () => {
		const { calls, caller } = createHarness();

		await expect(
			caller(null).analytics.readingDays({ utcOffsetMinutes: 0 }),
		).rejects.toMatchObject({ code: "UNAUTHORIZED" });
		expect(calls).toEqual([]);
	});

	it("rejects offsets no time zone has", async () => {
		const { calls, caller } = createHarness();

		await expect(
			caller(currentUser).analytics.readingDays({ utcOffsetMinutes: 900 }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		await expect(
			caller(currentUser).analytics.readingDays({ utcOffsetMinutes: 1.5 }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(calls).toEqual([]);
	});
});
