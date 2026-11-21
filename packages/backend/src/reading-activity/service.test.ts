import { describe, expect, it } from "vitest";
import { UnauthorizedError } from "../auth/current-user";
import { createReadingActivityService } from "./service";

function createHarness() {
	const calls: Array<{ appUserId: string; utcOffsetMinutes: number }> = [];
	const service = createReadingActivityService(
		{
			async listReadingDays(appUserId, utcOffsetMinutes) {
				calls.push({ appUserId, utcOffsetMinutes });
				return [{ date: "2026-11-20", stories: 2, papers: 1 }];
			},
		},
		{
			async getOrCreateAppUser(identity) {
				return { id: `app-${identity.workosUserId}` };
			},
		},
	);
	return { calls, service };
}

describe("reading activity service", () => {
	it("lists reading days for the authenticated app user", async () => {
		const { calls, service } = createHarness();

		await expect(
			service.listReadingDays({ workosUserId: "workos-user-1" }, -300),
		).resolves.toEqual([{ date: "2026-11-20", stories: 2, papers: 1 }]);
		expect(calls).toEqual([
			{ appUserId: "app-workos-user-1", utcOffsetMinutes: -300 },
		]);
	});

	it("requires authentication", async () => {
		const { calls, service } = createHarness();

		await expect(service.listReadingDays(null, 0)).rejects.toBeInstanceOf(
			UnauthorizedError,
		);
		expect(calls).toEqual([]);
	});
});
