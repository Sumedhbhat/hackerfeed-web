import { describe, expect, it } from "vitest";
import { evaluateFeatureFlags } from "./service";

const config = {
	example: {
		description: "off, with testers",
		enabled: false,
		enabledForUserIds: ["user_tester"],
	},
};

const tester = { workosUserId: "user_tester" };
const reader = { workosUserId: "user_reader" };

describe("feature flags", () => {
	it("turns a flag on for everyone when enabled", () => {
		const on = { example: { description: "on", enabled: true } };
		expect(evaluateFeatureFlags(null, on)).toEqual({ example: true });
		expect(evaluateFeatureFlags(reader, on)).toEqual({ example: true });
	});

	it("turns a disabled flag on only for listed users", () => {
		expect(evaluateFeatureFlags(tester, config)).toEqual({ example: true });
		expect(evaluateFeatureFlags(reader, config)).toEqual({ example: false });
		expect(evaluateFeatureFlags(null, config)).toEqual({ example: false });
	});
});
