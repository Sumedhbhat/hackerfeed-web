import axe from "axe-core";
import { expect } from "vitest";

// Contrast and full-page rules are off: happy-dom does no layout and tests
// render fragments. The e2e run covers them.
export async function expectNoAxeViolations(root: Element) {
	const results = await axe.run(root, {
		runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"],
		rules: {
			"color-contrast": { enabled: false },
			region: { enabled: false },
			"landmark-one-main": { enabled: false },
			"page-has-heading-one": { enabled: false },
		},
	});
	expect(
		results.violations.map(
			(violation) =>
				`${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`,
		),
	).toEqual([]);
}
