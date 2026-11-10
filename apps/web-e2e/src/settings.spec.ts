import { axeViolations, open, settled } from "./support/checks";
import { expect, test } from "./support/fixtures";

const accent = (page: import("@playwright/test").Page) =>
	page.evaluate(() =>
		document.documentElement.style.getPropertyValue("--accent"),
	);

test("picking a palette and a mode recolours the app at once", async ({
	page,
}) => {
	await open(page, "/settings");
	const palettes = page.getByRole("list", { name: "Palette" });
	await expect(
		palettes.getByRole("button", { name: "Reading room" }),
	).toHaveAttribute("aria-pressed", "true");
	expect(await accent(page)).toBe("");

	await palettes.getByRole("button", { name: "Ember" }).click();
	await expect(palettes.getByRole("button", { name: "Ember" })).toHaveAttribute(
		"aria-pressed",
		"true",
	);
	expect(await accent(page)).toMatch(/^light-dark\(#\w{6}, #\w{6}\)$/);

	await page
		.getByRole("toolbar", { name: "Mode" })
		.getByRole("button", { name: "Dark" })
		.click();
	await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

	await page.getByRole("link", { name: "Stories" }).click();
	await expect(page.getByRole("button", { name: "Theme: Dark" })).toBeVisible();
	expect(await accent(page)).not.toBe("");
});

test("a new palette is previewed, saved, selected, and can be deleted again", async ({
	page,
}) => {
	await open(page, "/settings");
	await page.getByRole("button", { name: "New palette" }).click();
	const name = page.getByRole("textbox", { name: "Name" });
	await expect(name).toBeFocused();

	await page.getByRole("button", { name: "Save palette" }).click();
	await expect(page.getByText("Give the palette a name.")).toBeVisible();

	await name.fill("Plum");
	await page.getByRole("button", { name: "Text", exact: true }).click();
	const text = page.getByRole("textbox", { name: "Text colour", exact: true });
	await text.fill("not a colour");
	await text.blur();
	await expect(page.getByText("Use six letters or digits")).toBeVisible();
	await text.fill("#2A1B3D");
	await text.press("Enter");
	await page
		.getByRole("textbox", { name: "Accent colour", exact: true })
		.fill("#FFD43B");
	await page
		.getByRole("textbox", { name: "Accent colour", exact: true })
		.press("Enter");
	await expect(
		page.getByText("Adjusted: The accent was darkened"),
	).toBeVisible();

	await page.getByRole("button", { name: "Save palette" }).click();
	const toast = page.getByRole("region", { name: "Notifications" });
	await expect(toast).toContainText("Saved Plum");
	await expect(page.getByRole("button", { name: "New palette" })).toBeFocused();
	await expect(
		page.getByRole("button", { name: "Plum", exact: true }),
	).toHaveAttribute("aria-pressed", "true");
	expect(await accent(page)).not.toBe("");

	await page.getByRole("button", { name: "Delete Plum" }).click();
	await page
		.getByRole("alertdialog")
		.getByRole("button", { name: "Delete" })
		.click();
	await expect(toast).toContainText("Deleted Plum");
	await expect(page.getByRole("button", { name: "Delete Plum" })).toHaveCount(
		0,
	);
	await expect(page.getByRole("button", { name: "New palette" })).toBeFocused();
	await expect(
		page.getByRole("button", { name: "Reading room" }),
	).toHaveAttribute("aria-pressed", "true");
	expect(await accent(page)).toBe("");
});

test("editing a palette saves the change and keeps it selected", async ({
	page,
}) => {
	await open(page, "/settings");
	await page.getByRole("button", { name: "Sunset", exact: true }).click();
	const before = await accent(page);

	await page.getByRole("button", { name: "Edit Sunset" }).click();
	await page.getByRole("textbox", { name: "Name" }).fill("Dusk");
	const accentField = page.getByRole("textbox", {
		name: "Accent colour",
		exact: true,
	});
	await accentField.fill("#0F766E");
	await accentField.press("Enter");
	await page.getByRole("button", { name: "Save palette" }).click();

	await expect(
		page.getByRole("region", { name: "Notifications" }),
	).toContainText("Saved Dusk");
	await expect(
		page.getByRole("button", { name: "Dusk", exact: true }),
	).toHaveAttribute("aria-pressed", "true");
	await expect(page.getByRole("button", { name: "Edit Sunset" })).toHaveCount(
		0,
	);
	expect(await accent(page)).not.toBe(before);
});

for (const palette of ["Ember", "Iris", "Midnight", "Sunset"]) {
	for (const scheme of ["light", "dark"] as const) {
		test(`${palette} passes axe in ${scheme} mode on the feed and in settings`, async ({
			page,
		}) => {
			await page.emulateMedia({ colorScheme: scheme });
			await open(page, "/settings");
			await page.getByRole("button", { name: palette, exact: true }).click();
			await settled(page);
			expect(await axeViolations(page)).toEqual([]);

			await page.getByRole("link", { name: "Stories" }).click();
			await page.getByRole("list", { name: "Top stories" }).waitFor();
			await settled(page);
			expect(await axeViolations(page)).toEqual([]);
		});
	}
}
