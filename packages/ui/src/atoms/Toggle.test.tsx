import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToggleButton } from "./Toggle";

afterEach(cleanup);

describe("ToggleButton", () => {
	it("stays focusable while disabled and ignores presses (WCAG 2.4.3)", () => {
		const onPressedChange = vi.fn();
		const { rerender } = render(
			<ToggleButton pressed={false} onPressedChange={onPressedChange}>
				Save
			</ToggleButton>,
		);
		const button = screen.getByRole("button", { name: "Save" });
		button.focus();
		fireEvent.click(button);
		expect(onPressedChange).toHaveBeenCalledWith(true);
		onPressedChange.mockClear();

		rerender(
			<ToggleButton pressed={false} onPressedChange={onPressedChange} disabled>
				Save
			</ToggleButton>,
		);
		// Natively disabled buttons drop out of the tab order.
		expect(button.hasAttribute("disabled")).toBe(false);
		expect(button.getAttribute("aria-disabled")).toBe("true");
		expect(document.activeElement).toBe(button);
		fireEvent.click(button);
		expect(onPressedChange).not.toHaveBeenCalled();
	});
});
