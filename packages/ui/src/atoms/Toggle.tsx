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

export function ToggleButton({
	variant = "ghost",
	onPressedChange,
	...props
}: ToggleButtonProps) {
	return (
		<BaseToggle
			className={buttonClassName(variant)}
			onPressedChange={(pressed) => onPressedChange?.(pressed)}
			{...props}
		/>
	);
}

const LAYOUT = {
	wrap: "flex flex-wrap gap-1",
	/** A track holding a few options, matching Tabs. */
	segmented:
		"inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-(--line) bg-(--chip-bg) p-1",
	/**
	 * One scrolling line on phones, with a fade showing there is more; a spacer
	 * after the last chip lets it scroll clear of the fade. The fade lifts while
	 * a chip has keyboard focus, so the focused one is never dimmed (WCAG 1.4.3).
	 * Wraps from `sm` up.
	 */
	scroll:
		"-mx-1 flex gap-2 overflow-x-auto px-1 py-1 [mask-image:linear-gradient(to_right,black_calc(100%-3.5rem),transparent)] has-focus-visible:[mask-image:none] [scrollbar-width:none] after:w-14 after:shrink-0 after:content-[''] sm:flex-wrap sm:overflow-visible sm:[mask-image:none] sm:after:hidden [&::-webkit-scrollbar]:hidden",
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
			{...aria}
		>
			{children}
		</BaseToggleGroup>
	);
}
