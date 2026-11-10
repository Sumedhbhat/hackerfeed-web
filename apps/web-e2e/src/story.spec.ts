import { open } from "./support/checks";
import { threadStory } from "./support/data";
import { expect, test } from "./support/fixtures";

test("Expand all and Collapse all open and close every reply", async ({
	page,
}) => {
	await open(page, `/story/${threadStory.id}`);
	const hide = page.getByRole("button", { name: /Hide replies/ });
	await expect(hide).toHaveCount(0);
	const collapsed = page.getByRole("button", { name: /^\d+ repl(y|ies)$/ });
	await expect(collapsed.first()).toBeVisible();
	await page.getByRole("button", { name: "Expand all replies" }).click();
	await expect(hide.first()).toBeVisible();
	await expect(collapsed).toHaveCount(0);
	await expect(
		page.getByRole("status").filter({ hasText: "All replies expanded." }),
	).toHaveCount(1);
	await page.getByRole("button", { name: "Collapse all replies" }).click();
	await expect(hide).toHaveCount(0);
});

test("opening replies keeps focus on the button", async ({ page }) => {
	await open(page, `/story/${threadStory.id}`);
	const replies = page
		.getByRole("button", { name: /^\d+ repl(y|ies)$/ })
		.first();
	await replies.focus();
	await page.keyboard.press("Enter");
	await expect(
		page.getByRole("button", { name: /Hide replies/ }).first(),
	).toBeFocused();
});

test("the page title names the story", async ({ page }) => {
	await open(page, `/story/${threadStory.id}`);
	await expect(page).toHaveTitle(`${threadStory.title} · HackerFeed`);
});
