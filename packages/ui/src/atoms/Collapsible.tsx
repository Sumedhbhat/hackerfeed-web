import { Collapsible as BaseCollapsible } from "@base-ui/react/collapsible";
import type { ReactNode } from "react";
import { type ButtonVariant, buttonClassName } from "./Button";

export function Collapsible({
	open,
	onOpenChange,
	children,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	children: ReactNode;
}) {
	return (
		<BaseCollapsible.Root
			open={open}
			onOpenChange={(next) => onOpenChange(next)}
		>
			{children}
		</BaseCollapsible.Root>
	);
}

export function CollapsibleTrigger({
	variant = "ghost",
	flush = false,
	inline = false,
	children,
	"aria-label": ariaLabel,
}: {
	variant?: ButtonVariant;
	flush?: boolean;
	inline?: boolean;
	children: ReactNode;
	"aria-label"?: string;
}) {
	return (
		<BaseCollapsible.Trigger
			className={`${buttonClassName(variant)}${flush ? " -ml-1.5 sm:-ml-2" : ""}${inline ? " -my-2.5 sm:-my-1.5" : ""}`}
			aria-label={ariaLabel}
		>
			{children}
		</BaseCollapsible.Trigger>
	);
}

export function CollapsiblePanel({ children }: { children: ReactNode }) {
	return <BaseCollapsible.Panel>{children}</BaseCollapsible.Panel>;
}
