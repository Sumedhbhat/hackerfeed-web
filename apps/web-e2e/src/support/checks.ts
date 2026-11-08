import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function open(page: Page, path: string) {
	await page.goto(path);
	await page.waitForLoadState("networkidle");
	await expect(page.locator("main")).toBeVisible();
}

export async function axeViolations(page: Page) {
	const { violations } = await new AxeBuilder({ page })
		.withTags([
			"wcag2a",
			"wcag2aa",
			"wcag21a",
			"wcag21aa",
			"wcag22aa",
			"best-practice",
		])
		.analyze();
	return violations.map(
		(violation) =>
			`${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`,
	);
}

export function horizontalOverflow(page: Page) {
	return page.evaluate(
		() => document.documentElement.scrollWidth - window.innerWidth,
	);
}

export function overlappingTargets(page: Page) {
	return page.evaluate(() => {
		window.scrollTo(0, 0);
		const controls = [
			...document.querySelectorAll(
				"main a, main button, main input, main textarea, header a, header button",
			),
		].filter((el) => {
			const box = el.getBoundingClientRect();
			return (
				box.width > 0 &&
				box.height > 0 &&
				getComputedStyle(el).visibility !== "hidden"
			);
		});
		const name = (el: Element) =>
			(el.getAttribute("aria-label") || el.textContent || el.tagName)
				.trim()
				.slice(0, 30);
		const hits: string[] = [];
		for (let i = 0; i < controls.length; i++) {
			for (let j = i + 1; j < controls.length; j++) {
				const [a, b] = [controls[i], controls[j]];
				if (a.contains(b) || b.contains(a)) continue;
				const [r1, r2] = [a.getBoundingClientRect(), b.getBoundingClientRect()];
				const width = Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left);
				const height =
					Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top);
				if (width > 1 && height > 1) hits.push(`${name(a)} × ${name(b)}`);
			}
		}
		return hits;
	});
}

export async function tabStopsWithoutFocusRing(page: Page, stops = 20) {
	await page.mouse.click(1, 1);
	const missing: string[] = [];
	for (let i = 0; i < stops; i++) {
		await page.keyboard.press("Tab");
		const stop = await page.evaluate(() => {
			const el = document.activeElement;
			if (!el || el === document.body) return null;
			const ringed = (node: Element) => {
				const style = getComputedStyle(node);
				return (
					(style.outlineStyle !== "none" &&
						Number.parseFloat(style.outlineWidth) > 0) ||
					style.boxShadow !== "none"
				);
			};
			let visible = ringed(el);
			for (
				let node = el.parentElement, depth = 0;
				!visible && node && depth < 3;
				node = node.parentElement, depth++
			) {
				visible = node.matches(":focus-within") && ringed(node);
			}
			return {
				label: (el.getAttribute("aria-label") || el.textContent || el.tagName)
					.trim()
					.slice(0, 40),
				visible,
			};
		});
		if (stop && !stop.visible) missing.push(stop.label);
	}
	return missing;
}

// Lines closer than 12px belong to the same section (a title and its facts).
export function cardSectionGaps(page: Page, nth = 1) {
	return page.evaluate((index) => {
		const card = document.querySelectorAll("main li")[index];
		const cardBox = card.getBoundingClientRect();
		const lines: { top: number; bottom: number }[] = [];
		const range = document.createRange();
		const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			const parent = node.parentElement;
			if (
				!node.textContent?.trim() ||
				!parent ||
				parent.closest(".sr-only,[hidden]")
			)
				continue;
			if (getComputedStyle(parent).visibility === "hidden") continue;
			let clip: DOMRect | null = null;
			for (
				let el: Element | null = parent;
				el && el !== card;
				el = el.parentElement
			) {
				if (/(hidden|clip)/.test(getComputedStyle(el).overflowY)) {
					clip = el.getBoundingClientRect();
					break;
				}
			}
			range.selectNodeContents(node);
			for (const rect of range.getClientRects()) {
				if (
					!rect.height ||
					(clip && (rect.top < clip.top - 1 || rect.bottom > clip.bottom + 1))
				)
					continue;
				lines.push({ top: rect.top, bottom: rect.bottom });
			}
		}
		lines.sort((a, b) => a.top - b.top);
		const rows: { top: number; bottom: number }[] = [];
		for (const line of lines) {
			const last = rows.at(-1);
			if (last && line.top < last.bottom - 2)
				last.bottom = Math.max(last.bottom, line.bottom);
			else rows.push({ ...line });
		}
		const gaps = [Math.round(rows[0].top - cardBox.top)];
		for (let i = 1; i < rows.length; i++) {
			const gap = rows[i].top - rows[i - 1].bottom;
			if (gap >= 12) gaps.push(Math.round(gap));
		}
		gaps.push(
			Math.round(cardBox.bottom - (rows.at(-1)?.bottom ?? cardBox.bottom)),
		);
		return gaps;
	}, nth);
}
