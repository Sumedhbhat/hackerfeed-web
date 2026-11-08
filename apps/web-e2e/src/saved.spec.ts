import { open } from "./support/checks";
import { expect, test } from "./support/fixtures";

test("unsaving shows a toast with Undo, keeps focus in the list, and Undo puts it back", async ({
	page,
}) => {
	await open(page, "/favorites?type=stories");
	const saved = page.getByRole("button", { name: /^Saved /, pressed: true });
	const count = await saved.count();
	const name = (await saved.first().getAttribute("aria-label")) ?? "";
	await saved.first().focus();
	await page.keyboard.press("Enter");

	const toast = page.getByRole("region", { name: "Notifications" });
	await expect(toast).toContainText(
		`Removed “${name.replace(/^Saved /, "")}” from Saved`,
	);
	await expect(toast).toContainText(`${count - 1} left.`);
	await expect(page.locator("#saved-list :focus")).toHaveCount(1);

	await page.keyboard.press("F6");
	await expect(toast).toBeFocused();
	await toast.getByRole("button", { name: "Undo" }).click();
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
