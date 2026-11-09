import { open } from "./support/checks";
import { firstPaper } from "./support/data";
import { expect, test } from "./support/fixtures";

test("a click anywhere on a paper's card opens the paper", async ({
	page,
	context,
}) => {
	await open(page, "/papers");
	const card = page.getByRole("listitem").filter({ hasText: firstPaper.title });
	const popup = context.waitForEvent("page");
	await card.click({ position: { x: 8, y: 8 } });
	expect((await popup).url()).toBe(
		`https://huggingface.co/papers/${firstPaper.arxivId}`,
	);
});

test("searching announces how many papers match", async ({ page }) => {
	await open(page, "/papers");
	const search = page.getByRole("searchbox", { name: "Search papers" });
	const status = page.getByRole("status");
	await search.fill(firstPaper.title);
	await expect(status.filter({ hasText: /^1 paper$/ })).toHaveCount(1);
	await search.fill("zzzz-no-such-paper");
	await expect(
		status.filter({ hasText: "No papers match these filters." }),
	).toHaveCount(1);
});

test("Next day stays focusable on the latest edition", async ({ page }) => {
	await open(page, "/papers");
	await page.getByRole("button", { name: "Previous day" }).click();
	const next = page.getByRole("button", { name: "Next day" });
	await expect(next).toBeEnabled();
	await next.focus();
	await page.keyboard.press("Enter");
	await expect(next).toBeDisabled();
	await expect(next).toBeFocused();
});
