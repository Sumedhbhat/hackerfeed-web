import axe from "axe-core";
import { expect } from "vitest";

/**
 * Fails the test if axe finds WCAG 2.2 AA or best-practice problems in
 * `root` (roles, names, list and landmark structure, ARIA). Colour contrast
 * and full-page rules are left to the browser QA run, since happy-dom does
 * no layout and tests render fragments.
 */
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
