import {
	axeViolations,
	cardSectionGaps,
	horizontalOverflow,
	open,
	overlappingTargets,
	scaleText,
	settled,
	tabStopsWithoutFocusRing,
} from "./support/checks";
import { threadStory } from "./support/data";
import { expect, test } from "./support/fixtures";

const SCREENS = [
	["feed", "/"],
	["story", `/story/${threadStory.id}`],
	["chat", `/chat/${threadStory.id}`],
	["papers", "/papers"],
	["saved stories", "/favorites?type=stories"],
	["saved papers", "/favorites?type=papers"],
	["profile", "/profile"],
	["signed out", "/auth/signed-out"],
] as const;

/** WCAG 1.4.12 text spacing. */
const TEXT_SPACING =
	"* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }";

for (const [name, path] of SCREENS) {
	test.describe(name, () => {
		for (const scheme of ["light", "dark"] as const) {
			test(`passes axe (WCAG 2.2 AA) in ${scheme} mode`, async ({ page }) => {
				await page.emulateMedia({ colorScheme: scheme });
				await open(page, path);
				expect(await axeViolations(page)).toEqual([]);
			});
		}

		test("has no sideways scroll or overlapping tap targets", async ({
			page,
		}) => {
			await open(page, path);
			expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
			expect(await overlappingTargets(page)).toEqual([]);
		});

		test("reflows at 320px (WCAG 1.4.10)", async ({ page }) => {
			await page.setViewportSize({ width: 320, height: 760 });
			await open(page, path);
			expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
		});

		test("keeps everything with WCAG text spacing (1.4.12)", async ({
			page,
		}) => {
			await open(page, path);
			await page.addStyleTag({ content: TEXT_SPACING });
			await settled(page);
			expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
		});

		test("keeps everything at 200% text size (1.4.4)", async ({ page }) => {
			await open(page, path);
			expect(await scaleText(page, 200)).toBeGreaterThanOrEqual(1.99);
			expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
		});

		test("shows a focus ring on every tab stop", async ({ page }) => {
			await open(page, path);
			expect(await tabStopsWithoutFocusRing(page)).toEqual([]);
		});
	});
}

for (const [name, path, list] of [
	["story cards", "/", "Top stories"],
	["paper cards", "/papers", "Papers"],
] as const) {
	test(`${name} space their sections evenly`, async ({ page }) => {
		await open(page, path);
		const gaps = await cardSectionGaps(
			page.getByRole("list", { name: list }).getByRole("listitem").nth(1),
		);
		expect(
			Math.max(...gaps) - Math.min(...gaps),
			`gaps ${gaps.join(", ")}`,
		).toBeLessThanOrEqual(4);
	});
}
