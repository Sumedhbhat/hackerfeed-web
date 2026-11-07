import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import { ToggleGroup as BaseToggleGroup } from "@base-ui/react/toggle-group";
import type { ReactNode } from "react";
import { type ButtonVariant, buttonClassName } from "./Button";

type ToggleButtonProps = Omit<
	BaseToggle.Props,
	"className" | "style" | "render" | "onPressedChange"
> & {
	variant?: ButtonVariant;
	onPressedChange?: (pressed: boolean) => void;
};

/**
 * A two-state button. `disabled` keeps it focusable (aria-disabled, presses
 * ignored): a Save button that is briefly busy must not drop keyboard focus
 * to the page (WCAG 2.4.3).
 */
export function ToggleButton({
	variant = "ghost",
	onPressedChange,
	disabled,
	...props
}: ToggleButtonProps) {
	return (
		<BaseToggle
			className={buttonClassName(variant)}
			aria-disabled={disabled || undefined}
			data-disabled={disabled ? "" : undefined}
			onPressedChange={(pressed) => {
				if (!disabled) onPressedChange?.(pressed);
			}}
			{...props}
		/>
	);
}

const LAYOUT = {
	wrap: "flex flex-wrap gap-1",
	/** A track holding a few options, matching Tabs. */
	segmented:
		"inline-flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-(--line) bg-(--chip-bg) p-1",
	/**
	 * One scrolling line on phones, with a fade showing there is more; a spacer
	 * after the last chip lets it scroll clear of the fade. The fade lifts while
	 * a chip has keyboard focus, so the focused one is never dimmed (WCAG 1.4.3).
	 * Wraps from `sm` up, and below 360px (e.g. 400% zoom), where most chips
	 * would be off-screen with no visible scrollbar (WCAG 1.4.10).
	 */
	scroll:
		"-mx-1 flex gap-2 overflow-x-auto px-1 py-1 [mask-image:linear-gradient(to_right,black_calc(100%-3.5rem),transparent)] has-focus-visible:[mask-image:none] [scrollbar-width:none] after:w-14 after:shrink-0 after:content-[''] sm:flex-wrap sm:overflow-visible sm:[mask-image:none] sm:after:hidden max-[359px]:flex-wrap max-[359px]:overflow-visible max-[359px]:[mask-image:none] max-[359px]:after:hidden [&::-webkit-scrollbar]:hidden",
} as const;

export function ToggleGroup<T extends string>({
	value,
	onValueChange,
	layout = "wrap",
	children,
	...aria
}: {
	value: T;
	onValueChange: (value: T) => void;
	layout?: keyof typeof LAYOUT;
	children: ReactNode;
	"aria-label"?: string;
	"aria-labelledby"?: string;
}) {
	return (
		<BaseToggleGroup
			value={[value]}
			onValueChange={(next) => {
				if (next[0] !== undefined) onValueChange(next[0] as T);
			}}
			className={LAYOUT[layout]}
			// Tab reaches the selected option and arrow keys move between them, the
			// toolbar pattern; say so to assistive tech instead of a plain group.
			role="toolbar"
			aria-orientation="horizontal"
			{...aria}
		>
			{children}
		</BaseToggleGroup>
	);
}
