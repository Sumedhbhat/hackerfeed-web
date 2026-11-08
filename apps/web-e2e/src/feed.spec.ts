import { open } from "./support/checks";
import { articleStory, discussionStory } from "./support/data";
import { expect, test } from "./support/fixtures";

test("a click anywhere on an article's card opens the article in a new tab", async ({
	page,
	context,
}) => {
	await open(page, "/");
	const card = page.locator("main li", { hasText: articleStory.title });
	const popup = context.waitForEvent("page");
	await card.click({ position: { x: 8, y: 8 } });
	expect((await popup).url()).toBe(articleStory.url);
});

test("Ask HN and Show HN posts open their discussion here", async ({
	page,
}) => {
	test.skip(!discussionStory, "today's snapshot has no Ask HN / Show HN post");
	await open(page, "/");
	const title = (discussionStory?.title ?? "").replace(/^(Ask|Show) HN: /, "");
	await page.locator("main h2 a", { hasText: title }).click();
	await expect(page).toHaveURL(`/story/${discussionStory?.id}`);
});

test("Top, New and Best switch the feed", async ({ page }) => {
	await open(page, "/");
	await page.getByRole("tab", { name: "New" }).click();
	await expect(page.getByRole("tab", { name: "New" })).toHaveAttribute(
		"aria-selected",
		"true",
	);
	await expect(page.getByRole("list", { name: "New stories" })).toBeVisible();
});

test("Load more puts focus on the first new story", async ({ page }) => {
	await open(page, "/");
	const list = page.getByRole("list", { name: "Top stories" });
	const before = await list.locator(":scope > li").count();
	await page.getByRole("button", { name: /^Load \d+ more/ }).click();
	await expect(list.locator(":scope > li")).not.toHaveCount(before);
	await expect(
		list.locator(":scope > li").nth(before).locator(":focus"),
	).toHaveCount(1);
});

test("Back from a story returns focus to the link that opened it", async ({
	page,
}) => {
	await open(page, "/");
	const comments = page.getByRole("link", { name: /^\d+ comments?: / }).nth(1);
	const name = await comments.getAttribute("aria-label");
	await comments.focus();
	await page.keyboard.press("Enter");
	await expect(page).toHaveURL(/\/story\//);
	await page.goBack();
	await expect(page.locator(":focus")).toHaveAttribute(
		"aria-label",
		name ?? "",
	);
});

test("the skip link moves focus past the header", async ({ page }) => {
	await open(page, "/");
	await page.keyboard.press("Tab");
	await expect(page.locator(":focus")).toHaveText("Skip to content");
	await page.keyboard.press("Enter");
	await expect(page.locator(":focus")).toHaveAttribute("id", "content");
});
