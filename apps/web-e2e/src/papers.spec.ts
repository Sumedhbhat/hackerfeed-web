import { open } from "./support/checks";
import { firstPaper } from "./support/data";
import { expect, test } from "./support/fixtures";

test("a click anywhere on a paper's card opens the paper", async ({
	page,
	context,
}) => {
	await open(page, "/papers");
	const card = page.locator("main li", { hasText: firstPaper.title });
	const popup = context.waitForEvent("page");
	await card.click({ position: { x: 8, y: 8 } });
	expect((await popup).url()).toContain(firstPaper.arxivId);
});

test("searching announces how many papers match", async ({ page }) => {
	await open(page, "/papers");
	await page
		.getByRole("searchbox", { name: "Search papers" })
		.fill("zzzz-no-such-paper");
	await expect(
		page.locator("output[aria-live]", {
			hasText: "No papers match these filters.",
		}),
	).toHaveCount(1);
});

test("Next day stays focusable on the latest edition", async ({ page }) => {
	await open(page, "/papers");
	await page.getByRole("button", { name: "Previous day" }).click();
	const next = page.getByRole("button", { name: "Next day" });
	await next.focus();
	await page.keyboard.press("Enter");
	await expect(next).toBeFocused();
	await expect(next).toHaveAttribute("aria-disabled", "true");
});
