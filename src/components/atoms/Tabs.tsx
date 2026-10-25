import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import type { ReactNode } from "react";

const TAB_CLASSES =
	"inline-flex cursor-pointer items-center pb-3 text-sm font-medium text-(--sea-ink-soft) transition-colors hover:text-(--sea-ink) focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-(--lagoon) data-active:text-(--lagoon-deep)";

export function Tabs<T extends string>({
	value,
	onValueChange,
	children,
}: {
	value: T;
	onValueChange: (value: T) => void;
	children: ReactNode;
}) {
	return (
		<BaseTabs.Root
			value={value}
			onValueChange={(next: T) => onValueChange(next)}
		>
			{children}
		</BaseTabs.Root>
	);
}

export function TabList({
	children,
	activateOnFocus = false,
	"aria-label": ariaLabel,
}: {
	children: ReactNode;
	activateOnFocus?: boolean;
	"aria-label": string;
}) {
	return (
		<BaseTabs.List
			activateOnFocus={activateOnFocus}
			aria-label={ariaLabel}
			className="flex items-center gap-6 border-b border-(--line)"
		>
			{children}
		</BaseTabs.List>
	);
}

export function Tab({
	value,
	children,
}: {
	value: string;
	children: ReactNode;
}) {
	return (
		<BaseTabs.Tab value={value} className={TAB_CLASSES}>
			{children}
		</BaseTabs.Tab>
	);
}

export function TabPanel({
	value,
	keepMounted = false,
	children,
}: {
	value: string;
	keepMounted?: boolean;
	children: ReactNode;
}) {
	return (
		<BaseTabs.Panel value={value} keepMounted={keepMounted}>
			{children}
		</BaseTabs.Panel>
	);
}
