import { describe, expect, it } from "vitest";
import { evaluateFeatureFlags, isFeatureEnabled } from "./service";

const config = {
	aiChat: {
		description: "off, with testers",
		enabled: false,
		enabledForUserIds: ["user_tester"],
	},
};

const tester = { workosUserId: "user_tester" };
const reader = { workosUserId: "user_reader" };

describe("feature flags", () => {
	it("turns a flag on for everyone when enabled", () => {
		const on = { aiChat: { description: "on", enabled: true } };
		expect(evaluateFeatureFlags(null, on)).toEqual({ aiChat: true });
		expect(evaluateFeatureFlags(reader, on)).toEqual({ aiChat: true });
	});

	it("turns a disabled flag on only for listed users", () => {
		expect(evaluateFeatureFlags(tester, config)).toEqual({ aiChat: true });
		expect(evaluateFeatureFlags(reader, config)).toEqual({ aiChat: false });
		expect(evaluateFeatureFlags(null, config)).toEqual({ aiChat: false });
	});

	it("checks a single flag", () => {
		expect(isFeatureEnabled("aiChat", tester, config)).toBe(true);
		expect(isFeatureEnabled("aiChat", null, config)).toBe(false);
	});
});
