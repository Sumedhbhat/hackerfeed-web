import { open } from "./support/checks";
import { expect, test } from "./support/fixtures";

test("the user menu opens analytics with the reader's streak", async ({
	page,
}) => {
	await open(page, "/");
	await page.getByRole("button", { name: "DR, user menu" }).click();
	await page.getByRole("menuitem", { name: "Analytics" }).click();

	await expect(page).toHaveTitle("Analytics · HackerFeed");
	await expect(page.getByText("Current streak")).toBeVisible();
	await expect(page.getByText("18 days").first()).toBeVisible();
	await expect(page.getByText("6 stories, 4 papers").first()).toBeVisible();
	await expect(
		page.getByRole("img", { name: /^You read on \d+ days of the last/ }),
	).toBeVisible();
});

test("the trend covers the range the reader picks", async ({ page }) => {
	await open(page, "/analytics");
	const range = page.getByRole("toolbar", { name: "Time range" });
	const summary = page.getByRole("status").filter({ hasText: /on \d+ days/ });

	await expect(summary).toContainText("in the last 30 days");
	await range.getByRole("button", { name: "7 days" }).click();
	await expect(summary).toContainText("on 7 days in the last 7 days");
	await expect(page.getByRole("table").getByRole("row")).toHaveCount(8);
	await range.getByRole("button", { name: "90 days" }).click();
	await expect(summary).toContainText("in the last 90 days");
});
