import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button, buttonClassName } from "./Button";

describe("Button", () => {
	it("renders a non-submitting primary button by default", () => {
		render(<Button>Save</Button>);
		const button = screen.getByRole("button", { name: "Save" });
		expect(button.getAttribute("type")).toBe("button");
		expect(button.className).toBe(buttonClassName("primary"));
	});

	it("keeps primary text white and secondary text in the ink color", () => {
		expect(buttonClassName("primary")).toContain("text-white");
		expect(buttonClassName("secondary")).toContain("text-(--sea-ink)");
	});
});
