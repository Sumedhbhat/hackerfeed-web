import { open } from "./support/checks";
import { threadStory } from "./support/data";
import { expect, test } from "./support/fixtures";

test("a sent question gets a reply, announced, with focus left in the box", async ({
	page,
}) => {
	await open(page, `/chat/${threadStory.id}`);
	const box = page.getByRole("textbox", { name: "Ask about this story" });
	await box.fill("Why does this matter?");
	await box.press("Enter");
	await expect(page.getByText("It comes down to two choices.")).toBeVisible();
	await expect(
		page.getByRole("status").filter({ hasText: "ChatGPT replied." }),
	).toHaveCount(1);
	await expect(box).toBeFocused();
});

test("long code in a reply can be scrolled with the keyboard", async ({
	page,
}) => {
	await open(page, `/chat/${threadStory.id}`);
	const box = page.getByRole("textbox", { name: "Ask about this story" });
	await box.fill("Show code");
	await box.press("Enter");
	const code = page.getByRole("region", { name: "Code" });
	await code.focus();
	await page.keyboard.press("ArrowRight");
	await expect
		.poll(() => code.evaluate((el) => el.scrollLeft))
		.toBeGreaterThan(0);
});

test("New chat can be undone", async ({ page }) => {
	await open(page, `/chat/${threadStory.id}`);
	const box = page.getByRole("textbox", { name: "Ask about this story" });
	await box.fill("Hello");
	await box.press("Enter");
	const reply = page.getByText("It comes down to two choices.");
	await expect(reply).toBeVisible();
	await page.getByRole("button", { name: "New chat" }).click();
	await expect(reply).toHaveCount(0);
	await expect(box).toBeFocused();
	const toast = page.getByRole("region", { name: "Notifications" });
	await expect(toast).toContainText("Started a new chat");
	await toast.getByRole("button", { name: "Undo" }).click();
	await expect(reply).toBeVisible();
});
