import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import { ToggleGroup as BaseToggleGroup } from "@base-ui/react/toggle-group";
import { Toolbar } from "@base-ui/react/toolbar";
import type { ReactNode } from "react";
import { type ButtonVariant, buttonClassName } from "./Button";

type ToggleButtonProps = Omit<
	BaseToggle.Props,
	"className" | "style" | "render" | "onPressedChange"
> & {
	variant?: ButtonVariant;
	onPressedChange?: (pressed: boolean) => void;
};

/** `disabled` keeps it focusable (aria-disabled, presses ignored), so a briefly busy Save doesn't drop keyboard focus to <body>. */
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
	segmented:
		"inline-flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-(--line) bg-(--chip-bg) p-1",
	/**
	 * The ::after spacer lets the last chip scroll clear of the fade, and the
	 * fade lifts while a chip has focus so it is never dimmed. Below 360px it
	 * wraps again: most chips would be off-screen with no visible scrollbar.
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
		<Toolbar.Root className={LAYOUT[layout]} {...aria}>
			<BaseToggleGroup
				value={[value]}
				onValueChange={(next) => {
					if (next[0] !== undefined) onValueChange(next[0] as T);
				}}
				className="contents"
			>
				{children}
			</BaseToggleGroup>
		</Toolbar.Root>
	);
}

export function ToggleGroupItem({
	variant,
	value,
	children,
}: {
	variant: ButtonVariant;
	value: string;
	children: ReactNode;
}) {
	return (
		<Toolbar.Button
			render={<BaseToggle value={value} />}
			className={buttonClassName(variant)}
		>
			{children}
		</Toolbar.Button>
	);
}
