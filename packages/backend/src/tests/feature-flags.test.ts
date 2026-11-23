import { describe, expect } from "vitest";
import { evaluateFeatureFlags } from "../feature-flags/service";
import { INTEGRATION, test } from "./support/test";

const config = {
	example: {
		description: "off, with testers",
		enabled: false,
		enabledForUserIds: ["user_tester"],
	},
};

const tester = { workosUserId: "user_tester" };
const reader = { workosUserId: "user_reader" };

describe("feature flag rules", () => {
	test("turn a flag on for everyone when enabled", () => {
		const on = { example: { description: "on", enabled: true } };
		expect(evaluateFeatureFlags(null, on)).toEqual({ example: true });
		expect(evaluateFeatureFlags(reader, on)).toEqual({ example: true });
	});

	test("turn a disabled flag on only for listed users", () => {
		expect(evaluateFeatureFlags(tester, config)).toEqual({ example: true });
		expect(evaluateFeatureFlags(reader, config)).toEqual({ example: false });
		expect(evaluateFeatureFlags(null, config)).toEqual({ example: false });
	});
});

describe("GET /api/feature-flags", () => {
	test(
		"returns the signed-in reader's flags, uncached",
		INTEGRATION,
		async ({ api, workos }) => {
			const response = await api.request("/api/feature-flags", {
				token: await workos.accessToken("user_reader"),
			});

			expect(response.status).toBe(200);
			expect(response.headers.get("Cache-Control")).toBe("no-store");
			expect(await response.json()).toEqual({
				flags: evaluateFeatureFlags(reader),
			});
		},
	);

	test("is only for signed-in readers", INTEGRATION, async ({ api }) => {
		expect((await api.request("/api/feature-flags")).status).toBe(401);
	});
});
