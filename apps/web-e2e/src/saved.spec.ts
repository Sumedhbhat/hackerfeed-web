import { open } from "./support/checks";
import { expect, test } from "./support/fixtures";

test("unsaving announces it, keeps focus in the list, and Undo puts it back", async ({
	page,
}) => {
	await open(page, "/favorites?type=stories");
	const saved = page.getByRole("button", { name: /^Saved /, pressed: true });
	const count = await saved.count();
	const first = saved.first();
	const name = (await first.getAttribute("aria-label")) ?? "";
	await first.focus();
	await page.keyboard.press("Enter");

	await expect(
		page.locator("output[aria-live]", {
			hasText: `Removed from Saved. ${count - 1} left.`,
		}),
	).toHaveCount(1);
	await expect(page.locator("#saved-list :focus")).toHaveCount(1);

	await page.getByRole("button", { name: /^Undo: put/ }).click();
	await expect(page.getByRole("button", { name, pressed: true })).toBeFocused();
	await expect(saved).toHaveCount(count);
});

test("saving from the feed marks the story saved", async ({ page }) => {
	await open(page, "/");
	const save = page
		.getByRole("button", { name: /^Save /, pressed: false })
		.first();
	const title = ((await save.getAttribute("aria-label")) ?? "").replace(
		/^Save /,
		"",
	);
	await save.click();
	await expect(
		page.getByRole("button", { name: `Saved ${title}`, pressed: true }),
	).toBeVisible();
});
