import { open } from "./support/checks";
import { articleStory, discussionStory, newestStory } from "./support/data";
import { expect, test } from "./support/fixtures";

test("a click anywhere on an article's card opens the article in a new tab", async ({
	page,
	context,
}) => {
	await open(page, "/");
	const card = page
		.getByRole("listitem")
		.filter({ hasText: articleStory.title });
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
	await page.getByRole("heading", { name: title }).getByRole("link").click();
	await expect(page).toHaveURL(`/story/${discussionStory?.id}`);
});

test("Top, New and Best switch the feed", async ({ page }) => {
	await open(page, "/");
	await page.getByRole("tab", { name: "New" }).click();
	await expect(
		page.getByRole("tab", { name: "New", selected: true }),
	).toBeVisible();
	await expect(
		page
			.getByRole("list", { name: "New stories" })
			.getByRole("listitem")
			.first(),
	).toContainText(newestStory.title ?? "");
});

test("Load more puts focus on the first new story", async ({ page }) => {
	await open(page, "/");
	const list = page.getByRole("list", { name: "Top stories" });
	const stories = list.getByRole("listitem");
	const before = await stories.count();
	await page.getByRole("button", { name: /^Load \d+ more/ }).click();
	await expect(stories).not.toHaveCount(before);
	await expect(stories.nth(before).locator(":focus")).toHaveCount(1);
});

test("Back from a story returns focus to the link that opened it", async ({
	page,
}) => {
	await open(page, "/");
	const title = (articleStory.title ?? "").replace(
		/[.*+?^${}()|[\]\\]/g,
		"\\$&",
	);
	const comments = page.getByRole("link", {
		name: new RegExp(`^\\d+ comments?: ${title}$`),
	});
	await comments.focus();
	await page.keyboard.press("Enter");
	await expect(page).toHaveURL(`/story/${articleStory.id}`);
	await page.goBack();
	await expect(comments).toBeFocused();
});

test("the skip link moves focus past the header", async ({ page }) => {
	await open(page, "/");
	await page.keyboard.press("Tab");
	await expect(
		page.getByRole("link", { name: "Skip to content" }),
	).toBeFocused();
	await page.keyboard.press("Enter");
	await page.keyboard.press("Tab");
	await expect(page.getByRole("main").locator(":focus")).toHaveCount(1);
});
