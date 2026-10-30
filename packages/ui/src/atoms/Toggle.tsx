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
	scroll: "papers-topics",
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
