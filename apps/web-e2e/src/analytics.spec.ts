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

test.describe("at local midnight", () => {
	test.use({ timezoneId: "America/New_York" });

	test("rolls over Today and refreshes it after a new read", async ({
		page,
	}) => {
		await page.clock.install({ time: new Date("2026-11-22T04:59:15Z") });
		await open(page, "/analytics");
		await expect(page.getByText("10 reads", { exact: true })).toBeVisible();

		await page.clock.pauseAt(new Date("2026-11-22T04:59:55Z"));
		await page.clock.fastForward(6000);
		await page.clock.resume();
		await expect(page.getByText("None yet", { exact: true })).toBeVisible();
		await expect(
			page.getByText("Read something today to keep it going."),
		).toBeVisible();

		await page.getByRole("link", { name: "Stories", exact: true }).click();
		await page
			.getByRole("link", { name: /^\d+ comments?: / })
			.first()
			.click();
		await page.getByRole("button", { name: "DR, user menu" }).click();
		await page.getByRole("menuitem", { name: "Analytics" }).click();
		await expect(page.getByText("1 read", { exact: true })).toBeVisible();
	});
});
